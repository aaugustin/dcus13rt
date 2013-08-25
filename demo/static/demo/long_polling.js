$(function () {
    function show_next_message() {
        $('<li><i>Loading…</i></li>')
            .appendTo($('ul'))
            .load('endpoint/', show_next_message);
    }
    show_next_message();
});
