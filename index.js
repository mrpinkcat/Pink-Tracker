const express = require('express'),
Discord = require('discord.js'),
bot = new Discord.Client(),
JsonDB = require('node-json-db'),
db = new JsonDB('db', true, true),
app = require('express')(),
server = require('http').createServer(app),
io = require('socket.io')(server);

bot.login(process.env._DISCORDTOKEN);

const correctChannelName = 'nas_is_back',
correctChannelId = '272461413572935680',
afkChannelId = '272705379316662272',
logChannelId = '358936696475090945',
botPrefix = '!',
deleteTimeout = 5, // en sec
loopTime = 5; // en min

server.listen(process.env._PORT, function() {
  console.log('Web server up on :' + process.env._PORT);
});

app.use('/', express.static(__dirname + '/web/'));

app.get('/', (req, res) => {
  res.sendFile('web/index.html', {
    root: __dirname
  });
});

/* ------------------
-------DISCORD-------
------------------ */

function dbTryCatch(path) { // fait un try catch dans la db pour voir si le dir existe
  try {
    var temp = db.getData(path);
  }
  catch (err) {
    return false;
  }
  return true;
}

function additionDb(path, value) {
  if (dbTryCatch(path))
  return db.getData(path) + value;
  else
  return value;
}

function recordStat() {
  var loop = setInterval(function () { // loop qui va envoyer les info de la guild
    for (let member of guild.members.values()) { // for of
      if (!member.user.bot) {// si le user n'est pas un bot

      var info = {
        id : member.user.id,
        username : member.user.username,
        avatarURL : member.user.avatarURL,
        online : member.user.presence.status === 'online' ? true : false,
        talk : (member.voiceChannelID && member.voiceChannelID !== afkChannelId) ? true : false,
        game : member.user.presence.game !== null ? member.user.presence.game.name : false
      };

      calcStat(info);
    }
  }
  console.log('loop OK');
}, loopTime * 60 * 1000);
}

function calcStat(info) {
  let toPush = {
    id : info.id,
    username: info.username,
    avatarURL: info.avatarURL,
    time: {
      connection: info.online ? additionDb(`/${info.id}/time/connection`, loopTime) : additionDb(`/${info.id}/time/connection`, 0), // if online
      talk: info.talk ? additionDb(`/${info.id}/time/talk`, loopTime) : additionDb(`/${info.id}/time/talk`, 0)
    }
  };
  db.push(`/${info.id}`, toPush);
  info.game ? db.push(`/${info.id}/time/game/${info.game}`, additionDb(`/${info.id}/time/game/${info.game}`, loopTime)) : `no game for ${info.username}`;
}

function addMessageToStat(userID, chanelID) {
  db.push(`/${userID}/message/${chanelID}`, additionDb(`/${userID}/message/${chanelID}`, 1));
  db.push(`/${userID}/message/all`, getTotalMessage(userID));
}

function getTotalMessage(userID) {
  let totalMessages = 0;
  for (let [index, value] of Object.entries(db.getData(`/${userID}/message`))) {
    if (index !== 'all')
    totalMessages = totalMessages + value;
  }
  return totalMessages;
}

function getGame(guildMember) {
  if (!guildMember.presence.game)
    return null;
  else
    return guildMember.presence.game.name;
}

function voiceChannelName(voiceChannel) {
  if (!voiceChannel)
    return undefined;
  else
    return voiceChannel.name;
}

function log(msg) {
  bot.channels.get(logChannelId).send(msg);
}

var guild;

if (botPrefix.length !== 1) {
  console.error('ERROR Votre prefix ne fait pas 1 caractère !');
  process.exit();
}

bot.on('ready', () => { // login
  recordStat();
  console.log('Tracking started!');
  guild = bot.guilds.get('272461413572935680');
});

bot.on('userUpdate', (oldUser, newUser) => {
  if (!newUser.bot) {
    if (oldUser.avatarURL != newUser.avatarURL) { // Détection de changement d'avatar
      log(`<@${newUser.id}> **change their avatar** for **${newUser.displayAvatarURL}**\n*${oldUser.displayAvatarURL} ⇒ ${newUser.displayAvatarURL}*`);
    }
    if (oldUser.username != newUser.username) { // Détection de changement de nom d'utlilisateur
      log(`<@${newUser.id}> **change their username** for **${newUser.username}**\n*${oldUser.username} ⇒ ${newUser.username}*`);
    }
  }
});

bot.on('presenceUpdate', (oldMember, newMember) => {
  if (!newMember.user.bot) {
    if (oldMember.presence.status != newMember.presence.status) { // Détection de status
      log(`<@${newMember.id}> is now **${newMember.presence.status}**\n*${oldMember.presence.status} ⇒ ${newMember.presence.status}*`);
    }
    if (getGame(oldMember) != getGame(newMember)) { // Détection de jeux
      if (!getGame(oldMember)) {
        log(`<@${newMember.id}> now playing ${getGame(newMember)}`);
      }
      if (!getGame(newMember)) {
        log(`<@${newMember.id}> stopped playing ${getGame(oldMember)}`);
      }
      if (getGame(oldMember) && getGame(newMember)) {
        log(`<@${newMember.id}> changes his game for **${getGame(newMember)}**\n*${getGame(oldMember)} => ${getGame(newMember)}*`);
      }
    }
  }
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
  if (!newMember.user.bot) {
    if (oldMember.selfDeaf != newMember.selfDeaf) { // mute et deaf par user
      if (newMember.selfDeaf)
      log(`<@${newMember.id}> **deaf** himself`);
      if (!newMember.selfDeaf)
      log(`<@${newMember.id}> **un-deaf** himself`);
    }
    if (oldMember.selfMute != newMember.selfMute && oldMember.selfDeaf === newMember.selfDeaf) {
      if (newMember.selfMute)
      log(`<@${newMember.id}> **mute** himself`);
      if (!newMember.selfMute)
      log(`<@${newMember.id}> **un-mute** himself`);
    }
    if (oldMember.serverDeaf != newMember.serverDeaf) { // mute et deaf par serveur
      if (newMember.serverDeaf)
      log(`<@${newMember.id}> became **deaf by the server**`);
      if (!newMember.serverDeaf)
      log(`<@${newMember.id}> became **un-deaf by the server**`);
    }
    if (oldMember.serverMute != newMember.serverMute) {
      if (newMember.serverMute)
      log(`<@${newMember.id}> became **mute by the server**`);
      if (!newMember.serverMute)
      log(`<@${newMember.id}> became **un-mute by the server**`);
    }
    if (voiceChannelName(oldMember.voiceChannel) != voiceChannelName(newMember.voiceChannel)) { // detection de channel
      if (!voiceChannelName(oldMember.voiceChannel) && voiceChannelName(newMember.voiceChannel)) {
        log(`<@${newMember.id}> **join ${voiceChannelName(newMember.voiceChannel)}**`);
      } else if (voiceChannelName(oldMember.voiceChannel) && !voiceChannelName(newMember.voiceChannel)) {
        log(`<@${newMember.id}> **leave ${voiceChannelName(oldMember.voiceChannel)}**`);
      } else {
        log(`<@${newMember.id}> **switch** to **${voiceChannelName(newMember.voiceChannel)}**\n*${voiceChannelName(oldMember.voiceChannel)} ⇒ ${voiceChannelName(newMember.voiceChannel)}*`);
      }
    }
  }
});

bot.on('message', message => {
  if (message.channel.type === 'text' && !message.author.bot) {
    addMessageToStat(message.author.id, message.channel.id);
  }

  if (message.channel.type === 'text' && message.channel.name !== correctChannelName && message.content[0] === botPrefix && message.author.id !== bot.user.id) { //surveillance des channels (sauf le bon)
    console.log(`fail de ${message.author.username} avec le message : ${message.content}`);
    console.log(`${message.content} (${message.author.username}) serra supprimé dans ${deleteTimeout}s`);

    message.reply('**tu fous quoi ?!** On est pas chez mémé là ! Mais comme je suis gentil, j\'ai transféré ton message au bot... Que ça ne se reproduise pas !');
    bot.channels.get(correctChannelId).send(message.content); // Revois le message dans le channel du bot
    setTimeout(function () { // supprime le message du user
      message.delete();
      console.log(`${message.content} (${message.author.username}) SUPPRIMÉ`);
    }, deleteTimeout * 1000);
  }
  if (message.channel.type === 'text' && message.channel.name !== correctChannelName && message.channel.id !== logChannelId && message.author.id === bot.user.id && message.content[0] !== botPrefix) { // auto supr du message du bot
    console.log(`La réponse du bot serra supprimé dans ${deleteTimeout}s`);
    setTimeout(function () {
      message.delete();
      console.log('Réponse du bot SUPPRIMÉE');
    }, deleteTimeout * 1000);
  }
});

/* ------------------
---------WEB---------
------------------ */

io.on('connection', function(socket) {
  console.log(`${socket.id} is connected`);
  socket.on('need_stats', function() {
    socket.emit('stats', db.getData('/'));
  });
});

function channelIDToName(channelID) {
  return guild.channels.get(channelID).name;
}
