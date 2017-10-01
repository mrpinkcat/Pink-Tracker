/* global io */

var socket = io();

$('.ui.card .image').dimmer({
  on: 'hover'
});
$('.shape').shape();

$('#plus-stat-btn').click(function() {
	$('.shape').shape('flip back');
});

socket.emit('connection');

socket.on('chibre', function(a) {
	console.log(a);
});
