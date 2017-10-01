const express = require('express'),
Discord = require('discord.js'),
bot = new Discord.Client(),
JsonDB = require('node-json-db'),
db = new JsonDB('web/guildDb', true, true),
app = require('express')(),
server = require('http').createServer(app),
io = require('socket.io')(server);

bot.login(process.env._DISCORDTOKEN);

const correctChannelName = 'nas_is_back',
correctChannelId = '272461413572935680',
botPrefix = '!',
deleteTimeout = 5, // en s
getInfoLoop = 5; // en s

server.listen(process.env._PORT, function() {
  console.log('Web server up on :' + process.env._PORT);
});

app.use('/', express.static(__dirname + '/web/'));

app.get('/', (req, res) => {
  res.sendFile('web/index.html', {
    root: __dirname
  });
});

io.on('connection', function(socket) {
  console.log(`${socket.id} is connected`);
});

// DISCORD

function dbTryCatch(path) { // fait un try catch dans la db pour voir si le dir existe
  try {
    var temp = db.getData(path);
  }
  catch (err) {
    return false;
  }
  return true;
}

function recordStat() {
  var loop = setInterval(function () { // loop qui va envoyer les info de la guild
    for (let member of guild.members.values()) { // for of
      let onVoice;

      if (!member.user.bot && member.voiceChannelID && member.voiceChannelID !== '272705379316662272')
      onVoice = true;
      else
      onVoice = false;

      if (!member.user.bot) { // si le user n'est pas un bot
      var info = {
        username : member.user.username,
        id : member.user.id,
        avatarURL : member.user.avatarURL,
        presence : member.user.presence,
        talk : onVoice
      };

      db.push(`/user/${member.user.id}`, info); // envois de info à la db
    }
  }
  calcStat();
}, getInfoLoop * 1000);
}

function calcStat() {
  let user = db.getData('/user');
  for (let [index, value] of Object.entries(user)) {
    let userOnlineTime;
    if (value.presence.status === 'online') {
      if (dbTryCatch(`/stats/${value.id}/onlineTime`))
        userOnlineTime = db.getData(`/stats/${value.id}/onlineTime`) + getInfoLoop;
      else
        userOnlineTime = getInfoLoop;
      db.push(`/stats/${value.id}/onlineTime`, userOnlineTime);
    }

    let userTalkTime;

    if (value.talk) {
      if (dbTryCatch(`/stats/${value.id}/talkTime`))
        userTalkTime = db.getData(`/stats/${value.id}/talkTime`) + getInfoLoop;
      else
        userTalkTime = getInfoLoop;
      db.push(`/stats/${value.id}/talkTime`, userTalkTime);

    }

    let gameTime;

    if (value.presence.game) {
      if (dbTryCatch(`/stats/${value.id}/game/${value.presence.game.name}`))
        gameTime = db.getData(`/stats/${value.id}/game/${value.presence.game.name}`) + getInfoLoop;
      else
        gameTime = getInfoLoop;
      db.push(`/stats/${value.id}/game/${value.presence.game.name}`, gameTime);
    }
  }
}

function addMessageToStat(userID, chanelID) {
  if (dbTryCatch(`/stats/${userID}/messages/${chanelID}`))
    db.push(`/stats/${userID}/messages/${chanelID}`, db.getData(`/stats/${userID}/messages/${chanelID}`) + 1);
  else
    db.push(`/stats/${userID}/messages/${chanelID}`, 1);
}

function getTotalMessage(userID) {
  if (dbTryCatch(`/stats/${userID}/messages`)) {
    let test = db.getData(`/stats/${userID}/messages`),
    totalMessages = 0;
    // console.log(test);

    for (let [index, value] of Object.entries(test)) {
      totalMessages = totalMessages + value;
    }

    console.log(totalMessages);
  }
}

function channelIDToName(channelID) {
  return guild.channels.get(channelID).name;
}

function userIDToName(userID) {
  return guild.members.get(userID).user.username;
}

var guild;

if (botPrefix.length !== 1) {
  console.error('ERROR Votre prefix ne fait pas 1 caractère !');
  process.exit();
}

bot.on('ready', () => {
  recordStat();
  console.log('Tracking started!');
  guild = bot.guilds.get('272461413572935680');
});

bot.on('message', message => {
  if (message.channel.type === 'text' && !message.author.bot) {
    addMessageToStat(message.author.id, message.channel.id);
  }

  if (message.content === '123') { // debug
    // recordStat();
    userIDToName(message.author.id);
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
  if (message.channel.type === 'text' && message.channel.name !== correctChannelName && message.author.id === bot.user.id && message.content[0] !== botPrefix) { // auto supr du message du bot
    console.log(`La réponse du bot serra supprimé dans ${deleteTimeout}s`);
    setTimeout(function () {
      message.delete();
      console.log('Réponse du bot SUPPRIMÉ');
    }, deleteTimeout * 1000);
  }
});
