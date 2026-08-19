const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

/* =========================================================
   SOCKET.IO
========================================================= */

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },

  transports: ["websocket", "polling"],

  pingInterval: 25000,
  pingTimeout: 60000,

  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

/* =========================================================
   SERVER SETTINGS
========================================================= */

const PORT = process.env.PORT || 3000;

const STARTING_MONEY = 200;
const TURN_TIME = 20;

/*
  مهم:
  الغرف موجودة في ذاكرة السيرفر.
  لذلك لازم يكون التطبيق شغال في Instance واحدة.
*/
const rooms = new Map();

/* =========================================================
   PLAYERS DATABASE
========================================================= */

const playersDatabase = {
  GK: [
    "Gianluigi Buffon",
    "Manuel Neuer",
    "Iker Casillas",
    "Peter Schmeichel",
    "Oliver Kahn",
    "Edwin van der Sar",
    "Petr Čech",
    "Lev Yashin",
    "Dino Zoff",
    "Gordon Banks",
    "Thibaut Courtois",
    "Alisson Becker",
    "Ederson",
    "Mike Maignan",
    "Jan Oblak",
    "Marc-André ter Stegen",
    "Emiliano Martínez",
    "Yassine Bounou",
    "David de Gea",
    "Hugo Lloris",
    "Keylor Navas",
    "Samir Handanović",
    "Wojciech Szczęsny",
    "Gianluigi Donnarumma",
    "André Onana",
    "Édouard Mendy",
    "Gregor Kobel",
    "Diogo Costa",
    "Unai Simón",
    "Jordan Pickford",
    "Aaron Ramsdale",
    "David Raya",
    "Bernd Leno",
    "Nick Pope",
    "Robert Sánchez",
    "Kepa Arrizabalaga",
    "Dean Henderson",
    "Yann Sommer",
    "Roman Bürki",
    "Kevin Trapp",
    "Marcelo Grohe",
    "Alphonse Areola",
    "Steve Mandanda",
    "Rui Patrício",
    "José Sá",
    "Anthony Lopes",
    "Fernando Muslera",
    "Claudio Bravo",
    "David Ospina",
    "Guillermo Ochoa",
    "Franco Armani",
    "Sergio Romero",
    "Gerónimo Rulli",
    "Gianluca Pagliuca",
    "Walter Zenga",
    "Angelo Peruzzi",
    "Francesco Toldo",
    "Dida",
    "Júlio César",
    "Victor Valdés",
    "Pepe Reina",
    "Santiago Cañizares",
    "Andoni Zubizarreta"
  ],

  DEF: [
    "Paolo Maldini",
    "Franz Beckenbauer",
    "Franco Baresi",
    "Alessandro Nesta",
    "Fabio Cannavaro",
    "Sergio Ramos",
    "Carles Puyol",
    "Rio Ferdinand",
    "Nemanja Vidić",
    "John Terry",
    "Ashley Cole",
    "Cafu",
    "Roberto Carlos",
    "Carlos Alberto",
    "Bobby Moore",
    "Gaetano Scirea",
    "Javier Zanetti",
    "Philipp Lahm",
    "Marcelo",
    "Gerard Piqué",
    "Thiago Silva",
    "Pepe",
    "Raphaël Varane",
    "Virgil van Dijk",
    "Rúben Dias",
    "William Saliba",
    "Antonio Rüdiger",
    "Achraf Hakimi",
    "Theo Hernández",
    "Alphonso Davies",
    "Trent Alexander-Arnold",
    "Andrew Robertson",
    "Marquinhos",
    "Éder Militão",
    "David Alaba",
    "Matthijs de Ligt",
    "Ronald Araújo",
    "Jules Koundé",
    "William Gallas",
    "Ricardo Carvalho",
    "Fernando Hierro",
    "Marcel Desailly",
    "Lilian Thuram",
    "Laurent Blanc",
    "Daniel Passarella",
    "Walter Samuel",
    "Jorge Costa",
    "Lúcio",
    "Giorgio Chiellini",
    "Leonardo Bonucci",
    "Gianluca Zambrotta",
    "Mauro Tassotti",
    "Alessandro Costacurta",
    "César Azpilicueta",
    "Diego Godín",
    "Martín Cáceres",
    "Javier Mascherano",
    "Éric Abidal",
    "Patrice Evra",
    "Raphaël Guerreiro",
    "João Cancelo",
    "Reece James",
    "Kyle Walker",
    "John Stones",
    "Mats Hummels",
    "Niklas Süle",
    "Jerome Boateng",
    "Victor Lindelöf",
    "Aymeric Laporte"
  ],

  MID: [
    "Zinedine Zidane",
    "Xavi",
    "Andrés Iniesta",
    "Luka Modrić",
    "Andrea Pirlo",
    "Xabi Alonso",
    "Clarence Seedorf",
    "Patrick Vieira",
    "Frank Lampard",
    "Steven Gerrard",
    "Paul Scholes",
    "Roy Keane",
    "Kaká",
    "Ronaldinho",
    "David Silva",
    "Cesc Fàbregas",
    "Mesut Özil",
    "Toni Kroos",
    "Kevin De Bruyne",
    "Rodri",
    "Jude Bellingham",
    "Federico Valverde",
    "Bernardo Silva",
    "Pedri",
    "Frenkie de Jong",
    "Martin Ødegaard",
    "Bruno Fernandes",
    "Declan Rice",
    "Joshua Kimmich",
    "Ilkay Gündogan",
    "Casemiro",
    "N'Golo Kanté",
    "Paul Pogba",
    "Marco Verratti",
    "Thiago Alcântara",
    "Sergio Busquets",
    "Jorginho",
    "Fabinho",
    "Thierry Henry",
    "Michael Ballack",
    "Bastian Schweinsteiger",
    "Michael Essien",
    "Yaya Touré",
    "Claude Makélélé",
    "Edgar Davids",
    "Wesley Sneijder",
    "Rivaldo",
    "Juan Román Riquelme",
    "Karel Poborský",
    "Luis Figo",
    "Rui Costa",
    "Paul Gascoigne",
    "Lothar Matthäus",
    "Ruud Gullit",
    "Socrates",
    "Dunga",
    "Zé Roberto",
    "James Rodríguez",
    "Christian Eriksen",
    "Thomas Müller",
    "Mason Mount",
    "Dominik Szoboszlai",
    "Eduardo Camavinga",
    "Aurélien Tchouaméni",
    "Enzo Fernández",
    "Alexis Mac Allister",
    "Nicolo Barella",
    "Hakan Çalhanoğlu",
    "Sandro Tonali"
  ],

  ATT: [
    "Pelé",
    "Diego Maradona",
    "Lionel Messi",
    "Cristiano Ronaldo",
    "Ronaldo Nazário",
    "Romário",
    "Johan Cruyff",
    "Marco van Basten",
    "George Best",
    "Ferenc Puskás",
    "Eusébio",
    "Garrincha",
    "Kenny Dalglish",
    "Gabriel Batistuta",
    "George Weah",
    "Samuel Eto'o",
    "Didier Drogba",
    "Thierry Henry",
    "Zlatan Ibrahimović",
    "Luis Suárez",
    "Neymar",
    "Mohamed Salah",
    "Kylian Mbappé",
    "Erling Haaland",
    "Vinícius Júnior",
    "Harry Kane",
    "Robert Lewandowski",
    "Karim Benzema",
    "Sadio Mané",
    "Son Heung-min",
    "Lautaro Martínez",
    "Antoine Griezmann",
    "Ousmane Dembélé",
    "Riyad Mahrez",
    "Raheem Sterling",
    "Sergio Agüero",
    "Wayne Rooney",
    "Robin van Persie",
    "Arjen Robben",
    "Franck Ribéry",
    "Nicolas Anelka",
    "David Villa",
    "Fernando Torres",
    "Andriy Shevchenko",
    "Filippo Inzaghi",
    "Alessandro Del Piero",
    "Francesco Totti",
    "Roberto Baggio",
    "Dennis Bergkamp",
    "Eric Cantona",
    "Alan Shearer",
    "Michael Owen",
    "Ruud van Nistelrooy",
    "Hernán Crespo",
    "Edinson Cavani",
    "Carlos Tevez",
    "Ángel Di María",
    "Lamine Yamal",
    "Rafael Leão",
    "Victor Osimhen",
    "Khvicha Kvaratskhelia",
    "Cole Palmer",
    "Bukayo Saka",
    "Phil Foden",
    "Marcus Rashford",
    "Romelu Lukaku",
    "Dusan Vlahovic"
  ]
};

/* =========================================================
   BUILD DATABASE
========================================================= */

function createPlayers(names, position) {
  const uniqueNames = [...new Set(names)];

  return uniqueNames.map((name, index) => {
    let rating;

    if (name === "Pelé" || name === "Diego Maradona") {
      rating = 98;
    } else if (
      name === "Lionel Messi" ||
      name === "Cristiano Ronaldo" ||
      name === "Ronaldo Nazário"
    ) {
      rating = 97;
    } else {
      rating = 84 + ((index * 7) % 12) - 4;
      rating = Math.max(80, Math.min(96, rating));
    }

    return {
      id: position.toLowerCase() + (index + 1),
      name,
      position,
      rating
    };
  });
}

playersDatabase.GK = createPlayers(playersDatabase.GK, "GK");
playersDatabase.DEF = createPlayers(playersDatabase.DEF, "DEF");
playersDatabase.MID = createPlayers(playersDatabase.MID, "MID");
playersDatabase.ATT = createPlayers(playersDatabase.ATT, "ATT");

console.log("=================================");
console.log("PLAYER DATABASE READY");
console.log(`GK:  ${playersDatabase.GK.length}`);
console.log(`DEF: ${playersDatabase.DEF.length}`);
console.log(`MID: ${playersDatabase.MID.length}`);
console.log(`ATT: ${playersDatabase.ATT.length}`);
console.log("=================================");

/* =========================================================
   ROOM CODE
========================================================= */

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

/* =========================================================
   RANDOM PLAYER
========================================================= */

function getRandomPlayer(position, usedPlayers) {
  const list = playersDatabase[position];

  if (!list || list.length === 0) {
    return null;
  }

  const available = list.filter(
    player => !usedPlayers.includes(player.id)
  );

  if (available.length === 0) {
    return null;
  }

  return available[
    Math.floor(Math.random() * available.length)
  ];
}

/* =========================================================
   TIMER
========================================================= */

function clearAuctionTimer(room) {
  if (!room) return;

  if (room.auctionTimer) {
    clearInterval(room.auctionTimer);
    clearTimeout(room.auctionTimer);
    room.auctionTimer = null;
  }
}

/* =========================================================
   PUBLIC PLAYER
========================================================= */

function publicPlayer(player) {
  if (!player) return null;

  return {
    id: player.id,
    name: player.name,
    position: player.position,
    rating: player.rating
  };
}

/* =========================================================
   PUBLIC PLAYERS
========================================================= */

function publicPlayers(room) {
  return room.players.map(player => ({
    id: player.id,
    name: player.name,
    money: player.money,
    team: player.team,
    connected: player.connected !== false
  }));
}

/* =========================================================
   SEND ROOM STATE
========================================================= */

function sendRoomState(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) return;

  io.to(roomCode).emit("roomState", {
    roomCode,

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

/* =========================================================
   RESET GAME
========================================================= */

function resetGame(room) {
  clearAuctionTimer(room);

  room.started = false;
  room.auction = null;
  room.usedPlayers = [];

  room.positionRounds = {
    GK: 1,
    DEF: 4,
    MID: 3,
    ATT: 3
  };

  room.rematchRequests = new Set();

  room.players.forEach(player => {
    player.money = STARTING_MONEY;
    player.team = [];
  });
}

/* =========================================================
   START ROUND
========================================================= */

function startNewRound(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) return;

  if (room.players.length !== 2) {
    return;
  }

  if (room.started) {
    return;
  }

  resetGame(room);

  room.started = true;

  io.to(roomCode).emit("gameStarted", {
    players: publicPlayers(room)
  });

  sendRoomState(roomCode);

  setTimeout(() => {
    const currentRoom = rooms.get(roomCode);

    if (currentRoom && currentRoom.started) {
      startAuction(roomCode);
    }
  }, 1000);
}

/* =========================================================
   START AUCTION
========================================================= */

function startAuction(roomCode) {
  const room = rooms.get(roomCode);

  if (!room || !room.started) {
    return;
  }

  clearAuctionTimer(room);

  const positions = ["GK", "DEF", "MID", "ATT"];

  const availablePositions = positions.filter(
    position => room.positionRounds[position] > 0
  );

  if (availablePositions.length === 0) {
    finishGame(roomCode);
    return;
  }

  let position =
    availablePositions[
      Math.floor(Math.random() * availablePositions.length)
    ];

  let player = getRandomPlayer(
    position,
    room.usedPlayers
  );

  if (!player) {
    room.positionRounds[position] = 0;
    startAuction(roomCode);
    return;
  }

  room.usedPlayers.push(player.id);

  const startingPlayer =
    room.players[
      Math.floor(Math.random() * room.players.length)
    ];

  room.auction = {
    player,
    position,
    currentBid: 0,
    currentBidderId: null,
    turnPlayerId: startingPlayer.id,
    timeLeft: TURN_TIME
  };

  sendRoomState(roomCode);

  startTurnTimer(roomCode);
}

/* =========================================================
   TIMER
========================================================= */

function startTurnTimer(roomCode) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) {
    return;
  }

  clearAuctionTimer(room);

  room.auction.timeLeft = TURN_TIME;

  sendRoomState(roomCode);

  room.auctionTimer = setInterval(() => {
    const currentRoom = rooms.get(roomCode);

    if (!currentRoom || !currentRoom.auction) {
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

/* =========================================================
   BID
========================================================= */

function makeBid(roomCode, socketId, amount) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) {
    return;
  }

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

/* =========================================================
   +1
========================================================= */

function bidOne(roomCode, socketId) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) return;

  const newBid = room.auction.currentBid + 1;

  makeBid(roomCode, socketId, newBid);
}

/* =========================================================
   CUSTOM BID
========================================================= */

function customBid(roomCode, socketId, amount) {
  const value = Number(amount);

  if (!Number.isInteger(value) || value <= 0) {
    io.to(socketId).emit(
      "auctionError",
      "اكتب رقم صحيح بالمليون"
    );
    return;
  }

  makeBid(roomCode, socketId, value);
}

/* =========================================================
   PASS
========================================================= */

function handlePass(roomCode) {
  const room = rooms.get(roomCode);

  if (!room || !room.auction) {
    return;
  }

  clearAuctionTimer(room);

  const auction = room.auction;

  const lastBidderId =
    auction.currentBidderId;

  const currentTurnPlayerId =
    auction.turnPlayerId;

  let winner;
  let loser;

  if (!lastBidderId) {
    winner = room.players.find(
      p => p.id !== currentTurnPlayerId
    );

    loser = room.players.find(
      p => p.id === currentTurnPlayerId
    );
  } else {
    winner = room.players.find(
      p => p.id === lastBidderId
    );

    loser = room.players.find(
      p => p.id !== lastBidderId
    );
  }

  if (!winner || !loser) {
    return;
  }

  const price = auction.currentBid;

  if (price > winner.money) {
    io.to(winner.id).emit(
      "auctionError",
      "رصيدك لا يكفي لهذه الصفقة"
    );
    return;
  }

  winner.money -= price;

  winner.team.push({
    ...auction.player,
    boughtFor: price
  });

  const replacement = getRandomPlayer(
    auction.position,
    room.usedPlayers
  );

  if (replacement) {
    room.usedPlayers.push(replacement.id);

    loser.team.push({
      ...replacement,
      boughtFor: 0,
      randomReplacement: true
    });
  }

  room.positionRounds[auction.position]--;

  const result = {
    winnerId: winner.id,
    loserId: loser.id,

    soldPlayer: publicPlayer(
      auction.player
    ),

    price,

    replacement: publicPlayer(
      replacement
    ),

    winnerMoney: winner.money,
    loserMoney: loser.money,

    winnerTeam: winner.team,
    loserTeam: loser.team
  };

  room.auction = null;

  io.to(roomCode).emit(
    "auctionFinished",
    result
  );

  sendRoomState(roomCode);

  const bothComplete = room.players.every(
    p => p.team.length >= 11
  );

  if (bothComplete) {
    finishGame(roomCode);
    return;
  }

  setTimeout(() => {
    const currentRoom = rooms.get(roomCode);

    if (currentRoom && currentRoom.started) {
      startAuction(roomCode);
    }
  }, 2500);
}

/* =========================================================
   FINISH GAME
========================================================= */

function finishGame(roomCode) {
  const room = rooms.get(roomCode);

  if (!room) return;

  clearAuctionTimer(room);

  room.auction = null;
  room.started = false;
  room.rematchRequests = new Set();

  const results = room.players.map(player => {
    const totalRating = player.team.reduce(
      (total, p) =>
        total + Number(p.rating || 0),
      0
    );

    const averageRating =
      player.team.length > 0
        ? totalRating / player.team.length
        : 0;

    return {
      id: player.id,
      name: player.name,
      money: player.money,
      team: player.team,
      rating: Number(
        averageRating.toFixed(1)
      )
    };
  });

  let winnerId = null;

  if (results.length === 2) {
    if (results[0].rating > results[1].rating) {
      winnerId = results[0].id;
    } else if (
      results[1].rating > results[0].rating
    ) {
      winnerId = results[1].id;
    }
  }

  io.to(roomCode).emit(
    "gameFinished",
    {
      players: results,
      winnerId,
      canPlayAgain: true
    }
  );

  sendRoomState(roomCode);

  console.log(
    `Game finished in room ${roomCode}`
  );
}

/* =========================================================
   PLAY AGAIN
========================================================= */

function requestPlayAgain(roomCode, socketId) {
  const room = rooms.get(roomCode);

  if (!room) {
    io.to(socketId).emit(
      "auctionError",
      "الغرفة غير موجودة"
    );
    return;
  }

  if (room.players.length !== 2) {
    io.to(socketId).emit(
      "auctionError",
      "يجب أن يكون هناك لاعبان"
    );
    return;
  }

  if (room.started) {
    io.to(socketId).emit(
      "auctionError",
      "الجولة الحالية لم تنتهِ بعد"
    );
    return;
  }

  const player = room.players.find(
    p => p.id === socketId
  );

  if (!player) {
    io.to(socketId).emit(
      "auctionError",
      "أنت لست داخل هذه الغرفة"
    );
    return;
  }

  if (!room.rematchRequests) {
    room.rematchRequests = new Set();
  }

  room.rematchRequests.add(socketId);

  const requested =
    room.rematchRequests.size;

  const total =
    room.players.length;

  const ready =
    requested === total;

  io.to(roomCode).emit(
    "rematchStatus",
    {
      requested,
      total,
      ready
    }
  );

  if (ready) {
    startNewRound(roomCode);
  }
}

/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on("connection", socket => {
  console.log(
    "Player connected:",
    socket.id
  );

  /* =======================================================
     CREATE ROOM
  ======================================================= */

  socket.on("createRoom", ({ name } = {}) => {
    if (!name || !name.trim()) {
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
          money: STARTING_MONEY,
          team: [],
          connected: true
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
      },

      rematchRequests: new Set(),

      createdAt: Date.now()
    };

    rooms.set(roomCode, room);

    socket.join(roomCode);

    socket.data.roomCode = roomCode;
    socket.data.playerName = name.trim();

    console.log(
      `ROOM CREATED: ${roomCode} BY ${name.trim()}`
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

    sendRoomState(roomCode);
  });

  /* =======================================================
     JOIN ROOM
  ======================================================= */

  socket.on(
    "joinRoom",
    ({ name, roomCode } = {}) => {
      if (!name || !name.trim()) {
        socket.emit(
          "errorMessage",
          "اكتب اسمك الأول"
        );
        return;
      }

      if (!roomCode || !roomCode.trim()) {
        socket.emit(
          "errorMessage",
          "اكتب كود الغرفة"
        );
        return;
      }

      const code =
        roomCode.trim().toUpperCase();

      console.log(
        `JOIN REQUEST: ${name.trim()} -> ${code}`
      );

      console.log(
        "AVAILABLE ROOMS:",
        [...rooms.keys()]
      );

      const room =
        rooms.get(code);

      if (!room) {
        console.log(
          `ROOM NOT FOUND: ${code}`
        );

        socket.emit(
          "errorMessage",
          "الغرفة غير موجودة"
        );

        return;
      }

      if (room.players.length >= 2) {
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
        money: STARTING_MONEY,
        team: [],
        connected: true
      };

      room.players.push(player);

      socket.join(code);

      socket.data.roomCode = code;
      socket.data.playerName = name.trim();

      console.log(
        `PLAYER JOINED ROOM: ${name.trim()} -> ${code}`
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

      sendRoomState(code);
    }
  );

  /* =======================================================
     START GAME
  ======================================================= */

  socket.on("startGame", () => {
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

    if (room.host !== socket.id) {
      socket.emit(
        "auctionError",
        "المضيف فقط يستطيع بدء اللعبة"
      );
      return;
    }

    if (room.players.length !== 2) {
      socket.emit(
        "auctionError",
        "يجب أن يكون هناك لاعبان"
      );
      return;
    }

    if (room.started) {
      return;
    }

    startNewRound(roomCode);
  });

  /* =======================================================
     PLAY AGAIN
  ======================================================= */

  socket.on("playAgain", () => {
    const roomCode =
      socket.data.roomCode;

    if (!roomCode) {
      socket.emit(
        "auctionError",
        "أنت لست داخل غرفة"
      );
      return;
    }

    requestPlayAgain(
      roomCode,
      socket.id
    );
  });

  /* =======================================================
     +1
  ======================================================= */

  socket.on("bidOne", () => {
    const roomCode =
      socket.data.roomCode;

    bidOne(
      roomCode,
      socket.id
    );
  });

  /* =======================================================
     CUSTOM BID
  ======================================================= */

  socket.on(
    "customBid",
    ({ amount } = {}) => {
      const roomCode =
        socket.data.roomCode;

      customBid(
        roomCode,
        socket.id,
        amount
      );
    }
  );

  /* =======================================================
     PASS
  ======================================================= */

  socket.on("passAuction", () => {
    const roomCode =
      socket.data.roomCode;

    handlePass(roomCode);
  });

  /* =======================================================
     DISCONNECT
  ======================================================= */

  socket.on("disconnect", reason => {
    console.log(
      `PLAYER DISCONNECTED: ${socket.id}`
    );

    console.log(
      `REASON: ${reason}`
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

    const player =
      room.players.find(
        p => p.id === socket.id
      );

    /*
      مهم جدًا:
      لا نحذف الغرفة بمجرد انقطاع الاتصال.

      الموبايل ممكن يفقد الاتصال لحظيًا،
      ولو حذفنا الغرفة هنا اللاعب الثاني
      سيحصل على "الغرفة غير موجودة".
    */

    if (player) {
      player.connected = false;
    }

    console.log(
      `ROOM ${roomCode} KEPT AFTER DISCONNECT`
    );

    sendRoomState(roomCode);

    /*
      لو اللاعب رجع عن طريق Socket.IO recovery
      أو عمل Join مرة أخرى، الغرفة ما زالت موجودة.
    */
  });

  /* =======================================================
     ERROR
  ======================================================= */

  socket.on("error", error => {
    console.error(
      "SOCKET ERROR:",
      error
    );
  });
});

/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json());

app.use(
  express.static(__dirname, {
    maxAge: 0,
    etag: false
  })
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    game: "EMBABI Online",
    rooms: rooms.size,
    time: new Date().toISOString()
  });
});

/* =========================================================
   ROOM DEBUG
========================================================= */

app.get("/rooms", (req, res) => {
  res.json({
    count: rooms.size,

    rooms: [...rooms.entries()].map(
      ([code, room]) => ({
        code,
        players: room.players.map(
          p => ({
            name: p.name,
            connected: p.connected
          })
        ),
        started: room.started
      })
    )
  });
});

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  res.status(404).send("EMBABI Online - Not Found");
});

/* =========================================================
   SERVER
========================================================= */

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log("=================================");
    console.log("      EMBABI ONLINE SERVER");
    console.log("=================================");
    console.log(
      `PORT: ${PORT}`
    );
    console.log(
      `ROOMS: ${rooms.size}`
    );
    console.log(
      `HEALTH: /health`
    );
    console.log("=================================");
    console.log("");
  }
);

/* =========================================================
   PROCESS ERRORS
========================================================= */

process.on(
  "uncaughtException",
  error => {
    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);