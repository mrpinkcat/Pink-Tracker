/* global io */

var socket = io();

$('.ui.card .image').dimmer({
  on: 'hover'
});
$('.shape').shape();

$('#plus-stat-btn').click(function() {
	$('.shape').shape('flip back');
  socket.emit('need_stats');
});

socket.emit('connection');

socket.on('stats', function(db) {
  createCard(db);
});

function createCard(userInfo) {
  for (let [index, value] of Object.entries(userInfo)) {
    $('#cards').append(`
    <div class="four wide column">

    <div class="ui people shape">
      <div class="sides">
        <div class="active side">

          <div class="ui card">
            <div class="image">
              <div class="ui dimmer">
                <div class="content">
                  <div class="center">
                    <div class="ui inverted button active" id="plus-stat-btn">Plus de stats</div>
                  </div>
                </div>
              </div>
              <img src="${value.avatarURL}">
            </div>
            <div class="content">
              <div class="header" id="xxx-name">${value.username}</div>
                <div class="meta"><span class="date">${value.id}</span></div>
                <div class="description">${value.time.talk} min de papotage</div>
              </div>
            </div>

          </div>

          <div class="side">
            <div class="ui card">
              <div class="content">
                <div class="header">${value.username} - Statistiques</div>
              </div>
              <div class="content"><h4 class="ui sub header">test</h4></div>
            </div>
          </div>

        </div>
      </div>
    </div>

    </div>`);
    console.log(value.usernameé);
  }
}
