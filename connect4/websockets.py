import types

import tulip

from django.conf import settings

# Players are registered in PLAYERS as soon as they send their nicks and until
# they disconnect. `game_id` is set when the player is invited to a game and
# it's unset when the game is finished or declined. `ws` is always set.

PLAYERS = {}    # nick -> (game_id, ws)

# A record is added in GAMES when a player invites another player and removed
# when either player disconnects from either connection. `ws` is set when each
# player connects for this game.

GAMES = {}      # id -> ((nick, ws), (nick, ws))

# This counter is used to generate incremental IDs for games.

GAME_COUNTER = 0


def connect(ws):
    """
    Manage connected players.

    Protocol:

    > nick ... - register with this nick

    < avail ... - player is available for playing
    < busy ... - player is currently playing
    < gone ... - player disconnected

    > invite ... - initiate an game with a partner
    < game ... - player initiated a game

    < error ... - you will be disconnected
    """
    nick = yield from set_nick(ws)
    if nick is None:
        return
    try:
        while ws.open and (yield from process_invite(ws, nick)):
            pass
    finally:
        unset_nick(nick)


@tulip.coroutine
def set_nick(ws):
    # Obtain a nick
    nick = yield from recv_cmd(ws, 'nick')
    if nick is None:
        return
    if nick in PLAYERS or len(nick) < 2:
        send_error(ws, "Nick is already in use or invalid.")
        return
    # Notify other players and get notified of other players
    for other_nick, other_player in PLAYERS.items():
        send_cmd(other_player.ws, 'avail', nick)
        send_cmd(ws, 'busy' if other_player.game_id else 'avail', other_nick)
    PLAYERS[nick] = types.SimpleNamespace(game_id=None, ws=ws)
    return nick


def unset_nick(nick):
    # Unregister nick
    end_game(nick)
    PLAYERS.pop(nick, None)
    # Notify other players
    for player in PLAYERS.values():
        send_cmd(player.ws, 'gone', nick)


@tulip.coroutine
def process_invite(ws, player_nick):
    # Obtain a partner
    partner_nick = yield from recv_cmd(ws, 'invite')
    if partner_nick is None:
        return None
    player = PLAYERS.get(player_nick)
    partner = PLAYERS.get(partner_nick)
    # Check that both players are available
    if player is None:
        send_error(player.ws, "You were disconnected.")
        return partner
    if player.game_id is not None:
        send_error(player.ws, "Please answer invitations first.")
        return partner
    if partner is None or partner.game_id is not None:
        send_error(player.ws, "{} isn't available.".format(partner_nick))
        return partner
    # Create the game and notify the players
    global GAME_COUNTER
    GAME_COUNTER += 1
    game_id = '{:x}'.format(GAME_COUNTER)
    GAMES[game_id] = (
        types.SimpleNamespace(nick=player_nick, ws=None),
        types.SimpleNamespace(nick=partner_nick, ws=None),
    )
    player.game_id = game_id
    partner.game_id = game_id
    send_cmd(player.ws, 'game', player_nick)
    send_cmd(partner.ws, 'game', player_nick)
    return partner


def play(ws):
    """
    Manage a game.

    Protocol:

    > join ... - player joins the game he created
    > accept ... - partner accepts the game he was invited to
    > refuse ... - partner refuses the game he was invited to
    = play ... - play in a given column

    < error ... - you will be disconnected

    The invited player plays first. Since he must go through the confirm
    dialog, he will generally connect second. Otherwise we abort the game.

    Clients determine game termination by themselves and close the connection.
    """
    player_game, partner_game = yield from start_game(ws)
    try:
        while ws.open:
            col = yield from recv_cmd(ws, 'play')
            if col is not None and partner_game.ws.open:
                send_cmd(partner_game.ws, 'play', col)
    finally:
        end_game(player_game.nick)


@tulip.coroutine
def start_game(ws):
    action, initiator_nick = yield from recv_cmd(ws, 'join', 'accept', 'refuse')
    try:
        initiator = PLAYERS[initiator_nick]
        game = GAMES[initiator.game_id]
        if action == 'join':            # Player who created the game connects first.
            assert game[0].ws is None
            assert game[1].ws is None
            game[0].ws = ws
            return game
        elif action == 'accept':        # Player who was invited connects second.
            assert game[0].ws is not None
            assert game[1].ws is None
            game[1].ws = ws
            return reversed(game)
        else:                           # Player who was invited may decline.
            assert game[0].ws is not None
            assert game[1].ws is None
            send_error(game[0].ws, game[1].nick + " refused to play.")
            end_game(initiator_nick)
    except (KeyError, AssertionError):
        send_error(ws, "Failed to establish connection.")
        end_game(initiator_nick)


def end_game(nick):
    # Terminates the connection of the partner and cleans up persistent data.
    # Expects the connection of the player to be terminated shortly.
    player = PLAYERS.get(nick)
    if player is None:
        return
    game_id = player.game_id
    if game_id is None:
        return
    game = GAMES.pop(game_id)
    partner_game = game[1 if game[0].nick == nick else 0]
    if partner_game.ws is not None and partner_game.ws.open:
        send_error(partner_game.ws, nick + " disconnected.")
    PLAYERS[partner_game.nick].game_id = None
    PLAYERS[nick].game_id = None


@tulip.coroutine
def recv_cmd(ws, *expected_commands):
    """Read a message in the 'cmd arg' format."""
    msg = yield from ws.recv()
    if msg is None:
        return None if len(expected_commands) == 1 else (None, None)
    if settings.DEBUG:
        print('< ' + msg)
    try:
        cmd, arg = msg.split(' ', 1)
    except (TypeError, ValueError):
        ws.close(1008, "Unable to parse command")
        raise
    try:
        assert cmd in expected_commands
    except AssertionError:
        ws.close(1008, "Unexpected command")
        raise
    return arg if len(expected_commands) == 1 else (cmd, arg)


def send_cmd(ws, cmd, arg):
    """Send a frame in the 'cmd arg' format."""
    msg = ' '.join([cmd, arg])
    if settings.DEBUG:
        print('> ' + msg)
    ws.send(msg)


def send_error(ws, msg):
    """Send a frame in the 'error msg' format and close connection."""
    if not ws.open:
        return
    msg = 'error ' + msg
    if settings.DEBUG:
        print('> ' + msg)
    ws.send(msg)
    ws.close()
