/* jslint browser: true, devel: true, plusplus: true, regexp: true */

(function ($) {

    "use strict";

    var colors = ['yellow', 'red'],
        offsets = [1, 7, 8, 9];

    // A Connect4 is an instance of the game.

    // The state of the board for one player is stored in a bitfield.
    // Since JavaScript only has 32 bits integers, it's an array.
    // An extra blank row and colunm is added to allow shifting.

    function Connect4() {
        this.heights = [0, 0, 0, 0, 0, 0, 0];
        this.player = 0;                // player who played the last turn
        this.bitfields = [new Array(56), new Array(56)];
        this.winner = null;
    }

    Connect4.prototype.play = function (col) {
        var row = this.heights[col];
        if (this.winner !== null || row === 6) {
            return;
        }
        row = this.heights[col]++;
        this.player = 1 - this.player;
        this.bitfields[this.player][8 * col + row] = true;
        if (this.player_wins()) {
            this.winner = this.player;
        } else if (this.players_tied()) {
            this.winner = -1;
        }
        return row;
    };

    Connect4.prototype.player_wins = function () {
        var bitfield = this.bitfields[this.player],
            initial,
            offset,
            i,
            c,
            r;
        for (i = 0; i < offsets.length; i++) {
            offset = offsets[i];
            for (c = 0; c < 7; c++) {
                for (r = 0; r < 6; r++) {
                    initial = 8 * c + r;
                    if (bitfield[initial] &&
                            bitfield[initial + offset] &&
                            bitfield[initial + 2 * offset] &&
                            bitfield[initial + 3 * offset]) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    Connect4.prototype.players_tied = function () {
        var i;
        for (i = 0; i < 7; i++) {
            if (this.heights[i] !== 6) {
                return false;
            }
        }
        return true;
    };

    // A Connect4UI in an instance of the board. It points to the game.

    function Connect4UI($board, $columns, options) {
        this.game = new Connect4();
        this.$board = $board;
        this.$columns = $columns;
        this.options = options;
    }

    Connect4UI.prototype.play = function (col) {
        var row = this.game.play(col),
            color = colors[this.game.player],
            $column = $(this.$columns[col]),
            $winner;

        $($column.children()[5 - row]).addClass(color).removeClass('empty');

        if (this.game.winner !== null) {
            $winner = $('<div>').addClass('winner');
            if (this.game.winner >= 0) {
                $winner.addClass(color);
                $winner.text(color + ' wins!');
            } else {
                $winner.text('Tie!');
            }
            this.$board.append($winner);
            this.$board.removeClass('active');
        }
    };

    // A Connect4WSUI handles remote play through websockets.

    function send_cmd(ws, cmd, arg) {
        ws.send([cmd, arg].join(' '));
    }

    function parse_cmd(msg) {
        var match = /(\w+) (.*)/.exec(msg);
        return {cmd: match[1], arg: match[2]};
    }

    function Connect4WSUI($board, $columns, $controls, options) {
        Connect4UI.call(this, $board, $columns, options);
        this.player = -1;
        this.$controls = $controls;
        this.$partner = $controls.find('#partner');
        this.$message = $controls.find('.message');
        this.urls = options.urls;
        this.urls.ws_host = 'ws://' + window.location.host;
        this.reset();
    }

    Connect4WSUI.prototype = new Connect4UI();

    Connect4WSUI.prototype.handle_connect = function (player_nick) {
        var ws = new WebSocket(this.urls.ws_host + this.urls.connect),
            wsui = this;
        this.connect_ws = ws;
        ws.onopen = function () {
            send_cmd(ws, 'nick', player_nick);
            $('input[name=connect]').attr({name: 'disconnect', value: "Disconnect"});
            $('#partner').prop('disabled', false);
            $('input[name=play]').prop('disabled', false);
        };
        ws.onmessage = function (event) {
            var msg = parse_cmd(event.data),
                $partner;
            if (msg.cmd === 'avail') {
                $('#partner').find('option[value=' + msg.arg + ']').remove();
                $partner = $('<option>').attr('value', msg.arg);
                $partner.text(msg.arg);
                $('#partner').find('optgroup[label=Available]').append($partner);
            } else if (msg.cmd === 'busy') {
                $('#partner').find('option[value=' + msg.arg + ']').remove();
                $partner = $('<option>').attr('value', msg.arg);
                $partner.text(msg.arg);
                $('#partner').find('optgroup[label=Playing]').append($partner);
            } else if (msg.cmd === 'gone') {
                $('#partner').find('option[value=' + msg.arg + ']').remove();
            } else if (msg.cmd === 'game') {
                wsui.handle_play(player_nick, msg.arg);
            } else if (msg.cmd === 'error') {
                alert(msg.arg);
                console.log("Error: " + msg.arg);
            } else {
                console.log("Bad command: " + msg);
            }
        };
        ws.onclose = function () {
            $('input[name=disconnect]').attr({name: 'connect', value: "Connect"});
            $('#partner').find('option').remove();
            $('#partner').prop('disabled', true);
            $('input[name=play]').prop('disabled', true);
        };
    };

    Connect4WSUI.prototype.disconnect = function () {
        this.connect_ws.close();
    };

    Connect4WSUI.prototype.invite = function (partner_nick) {
        send_cmd(this.connect_ws, 'invite', partner_nick);
    };

    Connect4WSUI.prototype.handle_play = function (player_nick, initiator_nick) {
        var ws = new WebSocket(this.urls.ws_host + this.urls.play),
            wsui = this;
        this.play_ws = ws;
        ws.onopen = function () {
            if (player_nick === initiator_nick) {
                wsui.reset();
                wsui.player = 1;
                send_cmd(ws, 'join', initiator_nick);
            } else if (confirm(initiator_nick + " invites you to play!")) {
                wsui.reset();
                wsui.player = 0;
                send_cmd(ws, 'accept', initiator_nick);
            } else {
                send_cmd(ws, 'refuse', initiator_nick);
            }
            wsui.update_hints();
        };
        ws.onmessage = function (event) {
            var msg = parse_cmd(event.data),
                col;
            if (msg.cmd === 'play') {
                col = parseInt(msg.arg, 10);
                wsui.play(col);
                if (wsui.game.winner !== null) {
                    wsui.play_ws.close();
                }
                wsui.update_hints();
            } else if (msg.cmd === 'error') {
                if (wsui.game.winner === null) {
                    alert(msg.arg);
                    console.log("Error: " + msg.arg);
                }
            } else {
                console.log("Bad command: " + msg);
            }
        };
        ws.onclose = function () {
            wsui.player = -1;
            wsui.update_hints();
        };
    };

    Connect4WSUI.prototype.play_alternatively = function (col) {
        this.play(col);
        send_cmd(this.play_ws, 'play', col);
        if (this.game.winner !== null) {
            this.play_ws.close();
        }
        this.update_hints()
    };

    Connect4WSUI.prototype.reset = function () {
        this.game = new Connect4();
        this.$board.find('.winner').remove();
        this.$board.find('.cell').addClass('empty').removeClass('red yellow');
    };

    Connect4WSUI.prototype.update_hints = function () {
        var active, message;
        this.$message.removeClass(colors[this.game.player]);
        if (this.game.winner !== null) {
            active = false;
            message = "Invite someone or wait for someone to invite you.";
        } else {
            this.$message.addClass(colors[1 - this.game.player])
            if (this.game.player === this.player) {
                active = true;
                message = "Click a column to play.";
            } else {
                active = false;
                message = "Wait for the other player.";
            }
        }
        this.$board.toggleClass('active', active);
        this.$message.text(message);
    }


    // jQuery plugin that hooks inputs to the classes above.

    $.fn.connect4 = function (options) {

        return this.each(function () {
            var $board = $(this),
                $columns = $board.children(),
                $controls,
                connect4ui;

            function default_on_column_click() {
                var $column = $(this),
                    col = $columns.index($column);
                connect4ui.play(col);
            }

            function websockets_on_connect() {
                var player_nick = $('#nick').val();
                if ($(this).attr('name') === 'connect') {
                    connect4ui.handle_connect(player_nick);
                } else {
                    connect4ui.disconnect();
                }
            }

            function websockets_on_play() {
                var partner_nick = $('#partner').val();
                connect4ui.invite(partner_nick);
            }

            function websockets_on_column_click() {
                var $column = $(this),
                    col = $columns.index($column);
                if (connect4ui.game.player === connect4ui.player) {
                    connect4ui.play_alternatively(col);
                }
            }

            switch (options && options.mode) {
            case 'websockets':
                $controls = $('.controls').first();
                connect4ui = new Connect4WSUI($board, $columns, $controls, options);
                $('input[name=connect]').click(websockets_on_connect);
                $('input[name=play]').click(websockets_on_play);
                $columns.click(websockets_on_column_click);
                break;
            default:
                connect4ui = new Connect4UI($board, $columns, options);
                $columns.click(default_on_column_click);
                break;
            }
        });

    };

}(jQuery));
