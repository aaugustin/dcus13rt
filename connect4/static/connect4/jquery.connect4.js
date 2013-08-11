(function ($) {

    "use strict";

    var colors = ['yellow', 'red'];
    var offsets = [1, 7, 8, 9];

    // A Connect4 is an instance of the game.

    // The state of the board for one player is stored in a bitfield.
    // Since JavaScript only has 32 bits integers, it's an array.
    // An extra blank row and colunm is added to allow shifting.

    function Connect4 () {
        this.heights = [0, 0, 0, 0, 0, 0, 0];
        this.player = 0;
        this.bitfields = [new Array(56), new Array(56)];
        this.winner = null;
    };

    Connect4.prototype.play = function (col) {
        var row = this.heights[col]++;
        this.player = 1 - this.player;
        this.bitfields[this.player][8 * col + row] = true;
        if (this.player_wins()) this.winner = this.player;
        return row;
    };

    Connect4.prototype.player_wins = function () {
        var bitfield = this.bitfields[this.player];
        var initial, offset;
        for (var i = 0; i < offsets.length; i++) {
            offset = offsets[i];
            for (var c = 0; c < 7; c++) {
                for (var r = 0; r < 6; r++) {
                    initial = 8 * c + r;
                    if (bitfield[initial + 3 * offset]
                      & bitfield[initial + 2 * offset]
                      & bitfield[initial + 1 * offset]
                      & bitfield[initial]) return true;
                }
            }
        }
        return false;
    };

    // A Connect4UI in an instance of the board. It points to the game.

    function Connect4UI ($board, $columns) {
        this.game = new Connect4();
        this.$board = $board;
        this.$columns = $columns;
    }

    Connect4UI.prototype.play = function (col) {
        var row = this.game.play(col),
            color = colors[this.game.player],
            $column = $(this.$columns[col]);

        $($column.children()[5 - row])
            .addClass(color)
            .removeClass('empty');

        if (this.game.winner !== null) {
            this.$board.append(
                '<div class="winner ' + color + '">' +
                    color + ' wins!' +
                '</div>');
            this.$board.find('.empty')
                .addClass('disabled')
                .removeClass('empty');
        }
        return row;
    };

    $.fn.connect4 = function () {

        return this.each(function () {
            var $board = $(this),
                $columns = $board.children(),
                connect4ui = new Connect4UI($board, $columns);

            function on_column_click (event) {
                var $column = $(this),
                    col = $columns.index($column),
                    row = connect4ui.play(col);
                if (connect4ui.game.winner !== null) {
                    $columns.unbind('click', on_column_click);
                }
                if (row === 5) {
                    $column.unbind('click', on_column_click);
                }
            };

            $columns.click(on_column_click);
        });

    };

}(jQuery));
