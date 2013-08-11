(function ($) {

    var colors = ['red', 'yellow'];

    function Connect4 () {
        this.heights = [0, 0, 0, 0, 0, 0, 0];
        this.player = 0;
    };

    Connect4.prototype.next_player = function () {
        return colors[this.player];
    }

    Connect4.prototype.play = function (col) {
        var row = this.heights[col]++;
        this.player = 1 - this.player;
        return row;
    };

    $.fn.connect4 = function () {

        return this.each(function () {
            var game = new Connect4(),
                $columns = $(this).children();

            function on_column_click (event) {
                var $column = $(this),
                    $rows = $column.children(),
                    color = game.next_player(),
                    col = $columns.index($column),
                    row = game.play(col);
                $($rows[5 - row]).addClass(color).removeClass('empty');
                if (row == 5) $column.unbind('click', on_column_click);
            };

            $columns.click(on_column_click);
        });

    };

}(jQuery));
