var fs = require('fs');
var Steam = require('steam');
var Dota2 = require('dota2');
var Long = require('long');
var config = require('./config.js');
var teams = {teams: []};

if(fs.existsSync('teams.json')) {
	teams = JSON.parse(fs.readFileSync('teams.json', "utf8"));
}


if (fs.existsSync('servers')) {
	Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

function inArray(needle, haystack) {
	var length = haystack.length;
	for(var i = 0; i < length; i++) {
		if(haystack[i] == needle) return true;
	}
	return false;
}

function getTeamNames() {
	var ret = [];
	for(i in teams.teams) {
		ret.push(teams.teams[i].name);
	}
	return ret;
}

function convertFriendIdToAccountId(friendId) {
	var temp = Long.fromString(friendId);
	return temp.getLowBits();
}

var bot = new Steam.SteamClient();

var dota2 = new Dota2(bot);

function getAccountIdsInDota() {
	var ret = [];
	for( id in bot.users ) {
		if(bot.users[id].gamePlayedAppId == 570) {
			ret.push(convertFriendIdToAccountId(id));
		}
	}	
	return ret;
}

function teamExists(teamId) {
	for(i in teams.teams) {
		console.log("comparing " + teams.teams[i].team_id + " to " + teamId);
		if(teams.teams[i].team_id == parseInt(teamId)) return true;
	}
	return false;
}

function checkAvailableTeams() {
	var accountIds = getAccountIdsInDota();
	var teamList = [];
	for(i in teams.teams) {
		var playersOnCount = 0;
		//for(memberIndex in teams.teams[i]) {
		for(j=0;j < teams.teams[i].members.length;j++) {
			var testId = teams.teams[i].members[j].account_id;
			if(inArray(parseInt(testId), accountIds)) playersOnCount++;
		}
		if(playersOnCount == 5) {
			teamList.push(teams.teams[i].name);
		}
	}
	return teamList;
}

// this comes in response to clientHello
dota2.on('clientWelcome', function() {
	console.log('clientWelcome');
	dota2.joinChatChannel({
		channel_name: config.guild,
		channel_type: Dota2.methods.joinChatChannel.channel_type.DOTAChannelType_Guild
	});
	//dota2.requestDefaultChatChannel({});
	dota2.requestChatChannelList({});
	//dota2.requestGuildData();
	dota2.toGCGetUserChatInfo({account_id : 4121130});
});

dota2.on('chatMessage', function(res) {
	console.log('chatMessage');
	console.log(res);
});

dota2.on('requestDefaultChatChannel', function(res) {
	console.log(res);
});
dota2.on('requestChatChannelList', function(res) {
	//fs.writeFileSync('chat.json',JSON.stringify(res));
});
dota2.on('guildData', function(res) {
	console.log(res);
});
dota2.on('toGCGetUserChatInfo', function(res) {
	console.log(res);
});


dota2.on('joinChatChannel', function(res) {
	console.log('joinChatChannel');
	console.log(res);
});

dota2.on('teamIDByName', function(res) {
	console.log("response");
	if(res.eresult != 1) return; // not successful
	console.log(res);
	if(!teamExists(res.team_id))
		dota2.teamProfile(res.team_id);
	else 
		console.log("Team Exists");
});

dota2.on('teamProfile', function(res) {
	console.log("team");
	teams.teams.push(res.team);
	fs.writeFile('teams.json', JSON.stringify(teams), function(err) {
		if(err) console.log("Error saving");
		else console.log("saved team list");
	});
});

bot.on('loggedOn', function() {
	console.log('Logged in!');
	bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
	bot.setPersonaName(config.bot.name); // to change its nickname
	bot.gamesPlayed([570]);
	setTimeout(function() {
		console.log("sending Hello");
		console.log(dota2.clientHello({}));

	}, 1000);
});

bot.on('friend', function(steamId, type) {
	console.log("found " + type);
	if(type == Steam.EFriendRelationship.PendingInvitee) {
		console.log("We have a new friend!");
		console.log(steamId);
		bot.addFriend(steamId);
	}
});

bot.logOn(config.credentials);

bot.on('message', function(source, message, type, chatter) {
	  // respond to both chat room and private messages
	console.log('Received message: ' + message);
	if (message == 'ping') {
		bot.sendMessage(source, 'pong', Steam.EChatEntryType.ChatMsg); // ChatMsg by default
	} else if (message == 'list') {
		console.log(bot.users);
		console.log(getAccountIdsInDota());
	} else if (message.substring(0,3) == 'add') {
		teamName = message.substring(4);
		dota2.teamIDByName({name : teamName});
	} else if (message == 'check') {
		var teams = checkAvailableTeams();
		bot.sendMessage(source, "The teams you can use are: ",Steam.EChatEntryType.ChatMsg);
		for(var i=0; i<teams.length;i++) {
			bot.sendMessage(source, teams[i],Steam.EChatEntryType.ChatMsg);
		}
	} else if (message =='test') {
		dota2.profile({account_id : '4121130'});
		
	} else if(message == 'teams') {
		var teams = getTeamNames();
		bot.sendMessage(source, "The teams I know about are: ",Steam.EChatEntryType.ChatMsg);
		for(var i=0; i<teams.length;i++) {
			bot.sendMessage(source, teams[i],Steam.EChatEntryType.ChatMsg);
		}
	}
});

dota2.on('profile', function(res) {
	console.log(res);
});

bot.on('error', function(e) {
	console.log(e);
});
