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

    $.fn.connect4 = function () {

        return this.each(function () {
            var game = new Connect4(),
                $board = $(this),
                $columns = $board.children();

            function on_column_click (event) {
                var $column = $(this),
                    $rows = $column.children(),
                    col = $columns.index($column),
                    row = game.play(col),
                    color = colors[game.player];
                $($rows[5 - row])
                    .addClass(color)
                    .removeClass('empty');
                if (game.winner !== null) {
                    $board.append('<div class="winner ' + color + '">' +
                                  color + ' wins!' +
                                  '</div>');
                    $board.find('.empty')
                        .addClass('disabled')
                        .removeClass('empty');
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
