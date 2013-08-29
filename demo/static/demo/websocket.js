$(function () {
    var ws = new WebSocket("ws://localhost:7999/");
    ws.onmessage = function (event) {
        $('<li>' + event.data + '</li>')
            .appendTo($('ul'));
    }
});
