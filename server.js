const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = 3000;
const STARTING_MONEY = 200;
const TURN_TIME = 20;

const rooms = new Map();

/* =========================
   PLAYERS DATABASE
========================= */

const playersDatabase = {
  GK: [
    { id: "gk1", name: "Mike Maignan", position: "GK", rating: 87 },
    { id: "gk2", name: "Alisson", position: "GK", rating: 89 },
    { id: "gk3", name: "Ederson", position: "GK", rating: 88 },
    { id: "gk4", name: "Thibaut Courtois", position: "GK", rating: 90 }
  ],

  DEF: [
    { id: "def1", name: "Virgil van Dijk", position: "DEF", rating: 89 },
    { id: "def2", name: "William Saliba", position: "DEF", rating: 87 },
    { id: "def3", name: "Rúben Dias", position: "DEF", rating: 88 },
    { id: "def4", name: "Antonio Rüdiger", position: "DEF", rating: 87 },
    { id: "def5", name: "Achraf Hakimi", position: "DEF", rating: 88 },
    { id: "def6", name: "Theo Hernández", position: "DEF", rating: 86 }
  ],

  MID: [
    { id: "mid1", name: "Kevin De Bruyne", position: "MID", rating: 89 },
    { id: "mid2", name: "Jude Bellingham", position: "MID", rating: 91 },
    { id: "mid3", name: "Rodri", position: "MID", rating: 90 },
    { id: "mid4", name: "Pedri", position: "MID", rating: 86 },
    { id: "mid5", name: "Federico Valverde", position: "MID", rating: 88 },
    { id: "mid6", name: "Bernardo Silva", position: "MID", rating: 88 }
  ],

  ATT: [
    { id: "att1", name: "Kylian Mbappé", position: "ATT", rating: 91 },
    { id: "att2", name: "Erling Haaland", position: "ATT", rating: 91 },
    { id: "att3", name: "Mohamed Salah", position: "ATT", rating: 89 },
    { id: "att4", name: "Vinícius Jr.", position: "ATT", rating: 90 },
    { id: "att5", name: "Lamine Yamal", position: "ATT", rating: 86 },
    { id: "att6", name: "Harry Kane", position: "ATT", rating: 90 }
  ]
};

/* =========================
   HELPERS
========================= */

function generateRoomCode() {
  let code;

  do {
    code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (rooms.has(code));

  return code;
}

function getRandomPlayer(position, usedPlayers) {
  const available = playersDatabase[position].filter(
    player => !usedPlayers.includes(player.id)
  );

  if (available.length === 0) {
    return null;
  }

  return available[
    Math.floor(Math.random() * available.length)
  ];
}

function clearAuctionTimer(room) {
  if (room.auctionTimer) {
    clearInterval(room.auctionTimer);
    clearTimeout(room.auctionTimer);
    room.auctionTimer = null;
  }
}

function publicPlayer(player) {
  if (!player) return null;

  return {
    id: player.id,
    name: player.name,
    position: player.position,
    rating: player.rating
  };
}

function publicPlayers(room) {
  return room.players.map(player => ({
    id: player.id,
    name: player.name,
    money: player.money,
    team: player.team
  }));
}

function sendRoomState(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) return;

  io.to(roomCode).emit("roomState", {
    players: publicPlayers(room),

    auction: room.auction
      ? {
          player: publicPlayer(room.auction.player),
          position: room.auction.position,
          currentBid: room.auction.currentBid,
          currentBidderId: room.auction.currentBidderId,
          turnPlayerId: room.auction.turnPlayerId,
          timeLeft: room.auction.timeLeft
        }
      : null
  });
}

/* =========================
   START AUCTION
========================= */

function startAuction(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) return;

  clearAuctionTimer(room);

  const positions = ["GK", "DEF", "MID", "ATT"];

  const availablePositions = positions.filter(
    position => room.positionRounds[position] > 0
  );

  if (availablePositions.length === 0) {
    finishGame(roomCode);
    return;
  }

  const position =
    availablePositions[
      Math.floor(
        Math.random() * availablePositions.length
      )
    ];

  const player = getRandomPlayer(
    position,
    room.usedPlayers
  );

  if (!player) {
    room.positionRounds[position] = 0;
    startAuction(roomCode);
    return;
  }

  room.usedPlayers.push(player.id);

  const randomStartingPlayer =
    room.players[
      Math.floor(
        Math.random() * room.players.length
      )
    ];

  room.auction = {
    player: player,
    position: position,

    currentBid: 0,
    currentBidderId: null,

    turnPlayerId: randomStartingPlayer.id,

    timeLeft: TURN_TIME
  };

  sendRoomState(roomCode);

  startTurnTimer(roomCode);
}

/* =========================
   TURN TIMER
========================= */

function startTurnTimer(roomCode) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) return;

  clearAuctionTimer(room);

  room.auction.timeLeft = TURN_TIME;

  sendRoomState(roomCode);

  room.auctionTimer = setInterval(() => {
    const currentRoom = rooms.get(roomCode);

    if (!currentRoom || !currentRoom.auction) {
      clearAuctionTimer(room);
      return;
    }

    currentRoom.auction.timeLeft--;

    if (currentRoom.auction.timeLeft <= 0) {
      clearAuctionTimer(currentRoom);
      handlePass(roomCode);
      return;
    }

    sendRoomState(roomCode);
  }, 1000);
}

/* =========================
   MAKE BID
========================= */

function makeBid(roomCode, socketId, amount) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) return;

  const auction = room.auction;

  if (auction.turnPlayerId !== socketId) {
    io.to(socketId).emit(
      "auctionError",
      "ليس دورك الآن"
    );
    return;
  }

  const player = room.players.find(
    p => p.id === socketId
  );

  if (!player) return;

  if (!Number.isInteger(amount) || amount <= 0) {
    io.to(socketId).emit(
      "auctionError",
      "المبلغ غير صحيح"
    );
    return;
  }

  if (amount <= auction.currentBid) {
    io.to(socketId).emit(
      "auctionError",
      "يجب أن تكون المزايدة أعلى من السعر الحالي"
    );
    return;
  }

  if (amount > player.money) {
    io.to(socketId).emit(
      "auctionError",
      `رصيدك ${player.money}M فقط`
    );
    return;
  }

  auction.currentBid = amount;
  auction.currentBidderId = socketId;

  const opponent = room.players.find(
    p => p.id !== socketId
  );

  if (!opponent) return;

  auction.turnPlayerId = opponent.id;

  startTurnTimer(roomCode);
}

/* =========================
   +1M
========================= */

function bidOne(roomCode, socketId) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) return;

  const newBid =
    room.auction.currentBid + 1;

  makeBid(
    roomCode,
    socketId,
    newBid
  );
}

/* =========================
   CUSTOM BID
========================= */

function customBid(roomCode, socketId, amount) {
  const value = Number(amount);

  if (!Number.isInteger(value) || value <= 0) {
    io.to(socketId).emit(
      "auctionError",
      "اكتب رقم صحيح بالمليون"
    );
    return;
  }

  makeBid(
    roomCode,
    socketId,
    value
  );
}

/* =========================
   PASS
========================= */

function handlePass(roomCode) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) return;

  clearAuctionTimer(room);

  const auction = room.auction;

  const lastBidderId =
    auction.currentBidderId;

  const currentTurnPlayerId =
    auction.turnPlayerId;

  let winner;
  let loser;

  /*
    الحالة 1:
    لا توجد أي مزايدة.

    اللاعب الذي لم يضغط سيب
    يحصل على اللاعب مجانًا.
  */

  if (!lastBidderId) {
    winner = room.players.find(
      p => p.id !== currentTurnPlayerId
    );

    loser = room.players.find(
      p => p.id === currentTurnPlayerId
    );
  }

  /*
    الحالة 2:
    توجد مزايدة.

    صاحب آخر مزايدة يفوز.
    اللاعب الآخر يخسر.
  */

  else {
    winner = room.players.find(
      p => p.id === lastBidderId
    );

    loser = room.players.find(
      p => p.id !== lastBidderId
    );
  }

  if (!winner || !loser) return;

  const price = auction.currentBid;

  /*
    حماية مهمة:
    الفائز فقط هو الذي يدفع.
  */

  if (price > winner.money) {
    io.to(winner.id).emit(
      "auctionError",
      "رصيدك لا يكفي لهذه الصفقة"
    );

    return;
  }

  /*
    خصم السعر من الفائز فقط
  */

  winner.money =
    winner.money - price;

  /*
    إضافة اللاعب الأصلي للفائز
  */

  winner.team.push({
    ...auction.player,
    boughtFor: price
  });

  /*
    اللاعب العشوائي للخاسر
    من نفس المركز
  */

  const replacement =
    getRandomPlayer(
      auction.position,
      room.usedPlayers
    );

  if (replacement) {

    room.usedPlayers.push(
      replacement.id
    );

    loser.team.push({
      ...replacement,
      boughtFor: 0,
      randomReplacement: true
    });
  }

  /*
    انتهت جولة هذا المركز
  */

  room.positionRounds[
    auction.position
  ]--;

  /*
    حفظ معلومات النتيجة
    قبل الانتقال للمزاد التالي
  */

  const result = {
    winnerId: winner.id,
    loserId: loser.id,

    soldPlayer:
      publicPlayer(auction.player),

    price: price,

    replacement:
      publicPlayer(replacement),

    winnerMoney:
      winner.money,

    loserMoney:
      loser.money,

    winnerTeam:
      winner.team,

    loserTeam:
      loser.team
  };

  room.auction = null;

  /*
    إرسال النتيجة للاثنين
  */

  io.to(roomCode).emit(
    "auctionFinished",
    result
  );

  /*
    تحديث الرصيد والفرق
  */

  sendRoomState(roomCode);

  /*
    هل اكتمل الفريقان؟
  */

  const bothComplete =
    room.players.every(
      p => p.team.length >= 11
    );

  if (bothComplete) {
    finishGame(roomCode);
    return;
  }

  /*
    بدء المزاد التالي
  */

  setTimeout(() => {
    const currentRoom =
      rooms.get(roomCode);

    if (
      currentRoom &&
      currentRoom.started
    ) {
      startAuction(roomCode);
    }
  }, 2500);
}

/* =========================
   FINISH GAME
========================= */

function finishGame(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) return;

  clearAuctionTimer(room);

  room.auction = null;
  room.started = false;

  const results =
    room.players.map(player => {

      const totalRating =
        player.team.reduce(
          (total, p) =>
            total + p.rating,
          0
        );

      const averageRating =
        player.team.length > 0
          ? totalRating /
            player.team.length
          : 0;

      return {
        id: player.id,
        name: player.name,
        money: player.money,
        team: player.team,
        rating:
          Number(
            averageRating.toFixed(1)
          )
      };
    });

  let winnerId = null;

  if (
    results.length === 2
  ) {
    if (
      results[0].rating >
      results[1].rating
    ) {
      winnerId = results[0].id;
    }

    else if (
      results[1].rating >
      results[0].rating
    ) {
      winnerId = results[1].id;
    }
  }

  io.to(roomCode).emit(
    "gameFinished",
    {
      players: results,
      winnerId
    }
  );
}

/* =========================
   SOCKET CONNECTION
========================= */

io.on(
  "connection",
  socket => {

    console.log(
      "Player connected:",
      socket.id
    );

    /* =====================
       CREATE ROOM
    ===================== */

    socket.on(
      "createRoom",
      ({ name }) => {

        if (
          !name ||
          !name.trim()
        ) {
          socket.emit(
            "errorMessage",
            "اكتب اسمك الأول"
          );
          return;
        }

        const roomCode =
          generateRoomCode();

        const room = {

          host: socket.id,

          started: false,

          players: [
            {
              id: socket.id,
              name: name.trim(),

              money:
                STARTING_MONEY,

              team: []
            }
          ],

          usedPlayers: [],

          auction: null,

          auctionTimer: null,

          positionRounds: {
            GK: 1,
            DEF: 4,
            MID: 3,
            ATT: 3
          }
        };

        rooms.set(
          roomCode,
          room
        );

        socket.join(
          roomCode
        );

        socket.data.roomCode =
          roomCode;

        socket.data.playerName =
          name.trim();

        console.log(
          `Room ${roomCode} created by ${name}`
        );

        socket.emit(
          "roomCreated",
          {
            roomCode,

            players:
              publicPlayers(room),

            isHost: true
          }
        );
      }
    );

    /* =====================
       JOIN ROOM
    ===================== */

    socket.on(
      "joinRoom",
      ({ name, roomCode }) => {

        if (
          !name ||
          !name.trim()
        ) {
          socket.emit(
            "errorMessage",
            "اكتب اسمك الأول"
          );
          return;
        }

        if (
          !roomCode ||
          !roomCode.trim()
        ) {
          socket.emit(
            "errorMessage",
            "اكتب كود الغرفة"
          );
          return;
        }

        const code =
          roomCode
            .trim()
            .toUpperCase();

        const room =
          rooms.get(code);

        if (!room) {
          socket.emit(
            "errorMessage",
            "الغرفة غير موجودة"
          );
          return;
        }

        if (
          room.players.length >= 2
        ) {
          socket.emit(
            "errorMessage",
            "الغرفة ممتلئة"
          );
          return;
        }

        if (room.started) {
          socket.emit(
            "errorMessage",
            "اللعبة بدأت بالفعل"
          );
          return;
        }

        const player = {
          id: socket.id,
          name: name.trim(),

          money:
            STARTING_MONEY,

          team: []
        };

        room.players.push(
          player
        );

        socket.join(code);

        socket.data.roomCode =
          code;

        socket.data.playerName =
          name.trim();

        console.log(
          `${name} joined room ${code}`
        );

        socket.emit(
          "roomJoined",
          {
            roomCode: code,

            players:
              publicPlayers(room),

            isHost: false
          }
        );

        io.to(code).emit(
          "playersUpdated",
          {
            players:
              publicPlayers(room)
          }
        );
      }
    );

    /* =====================
       START GAME
    ===================== */

    socket.on(
      "startGame",
      () => {

        const roomCode =
          socket.data.roomCode;

        const room =
          rooms.get(roomCode);

        if (!room) {
          socket.emit(
            "auctionError",
            "الغرفة غير موجودة"
          );
          return;
        }

        if (
          room.host !==
          socket.id
        ) {
          socket.emit(
            "auctionError",
            "المضيف فقط يستطيع بدء اللعبة"
          );
          return;
        }

        if (
          room.players.length !== 2
        ) {
          socket.emit(
            "auctionError",
            "يجب أن يكون هناك لاعبان"
          );
          return;
        }

        if (room.started) {
          return;
        }

        room.started = true;

        room.usedPlayers = [];

        room.positionRounds = {
          GK: 1,
          DEF: 4,
          MID: 3,
          ATT: 3
        };

        room.players.forEach(
          player => {

            player.money =
              STARTING_MONEY;

            player.team = [];
          }
        );

        io.to(roomCode).emit(
          "gameStarted",
          {
            players:
              publicPlayers(room)
          }
        );

        setTimeout(
          () => {
            startAuction(
              roomCode
            );
          },
          1000
        );
      }
    );

    /* =====================
       +1M
    ===================== */

    socket.on(
      "bidOne",
      () => {

        const roomCode =
          socket.data.roomCode;

        bidOne(
          roomCode,
          socket.id
        );
      }
    );

    /* =====================
       CUSTOM BID
    ===================== */

    socket.on(
      "customBid",
      ({ amount }) => {

        const roomCode =
          socket.data.roomCode;

        customBid(
          roomCode,
          socket.id,
          amount
        );
      }
    );

    /* =====================
       PASS
    ===================== */

    socket.on(
      "passAuction",
      () => {

        const roomCode =
          socket.data.roomCode;

        handlePass(
          roomCode
        );
      }
    );

    /* =====================
       DISCONNECT
    ===================== */

    socket.on(
      "disconnect",
      () => {

        console.log(
          "Player disconnected:",
          socket.id
        );

        const roomCode =
          socket.data.roomCode;

        if (!roomCode) {
          return;
        }

        const room =
          rooms.get(roomCode);

        if (!room) {
          return;
        }

        clearAuctionTimer(
          room
        );

        rooms.delete(
          roomCode
        );

        console.log(
          `Room ${roomCode} deleted`
        );
      }
    );
  }
);

/* =========================
   EXPRESS
========================= */

app.use(
  express.static(__dirname)
);

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

/* =========================
   SERVER
========================= */

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `EMBABI Online Server running on port ${PORT}`
    );

  }
);