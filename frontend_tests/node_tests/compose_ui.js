zrequire('compose_ui');
zrequire('people');
zrequire('user_status');

set_global('document', {
    execCommand: function () { return false; },
});

set_global('$', global.make_zjquery());
set_global('i18n', global.stub_i18n);
set_global('blueslip', {});

var alice = {
    email: 'alice@yakkl.com',
    user_id: 101,
    full_name: 'Alice',
};
var bob = {
    email: 'bob@yakkl.com',
    user_id: 102,
    full_name: 'Bob',
};

global.people.add_in_realm(alice);
global.people.add_in_realm(bob);

var noop = function () {};

function make_textbox(s) {
    // Simulate a jQuery textbox for testing purposes.
    var widget = {};

    widget.s = s;
    widget.focused = false;

    widget.caret = function (arg) {
        if (typeof arg === 'number') {
            widget.pos = arg;
            return;
        }

        if (arg) {
            widget.insert_pos = widget.pos;
            widget.insert_text = arg;
            var before = widget.s.slice(0, widget.pos);
            var after = widget.s.slice(widget.pos);
            widget.s = before + arg + after;
            widget.pos += arg.length;
            return;
        }

        return widget.pos;
    };

    widget.focus = function () {
        widget.focused = true;
    };

    widget.blur = function () {
        widget.focused = false;
    };

    widget.val = function (new_val) {
        if (new_val) {
            widget.s = new_val;
        } else {
            return widget.s;
        }
    };

    widget.trigger = function () {
        return;
    };

    return widget;
}

run_test('insert_syntax_and_focus', () => {
    blueslip.error = noop;
    blueslip.log = noop;
    $('#compose-textarea').val("xyz ");
    $('#compose-textarea').caret = function (syntax) {
        if (syntax !== undefined) {
            $('#compose-textarea').val($('#compose-textarea').val() + syntax);
        } else {
            return 4;
        }
    };
    compose_ui.insert_syntax_and_focus(':octopus:');
    assert.equal($('#compose-textarea').caret(), 4);
    assert.equal($('#compose-textarea').val(), 'xyz :octopus: ');
    assert($("#compose-textarea").is_focused());

});

run_test('smart_insert', () => {
    var textbox = make_textbox('abc');
    textbox.caret(4);

    compose_ui.smart_insert(textbox, ':smile:');
    assert.equal(textbox.insert_pos, 4);
    assert.equal(textbox.insert_text, ' :smile: ');
    assert.equal(textbox.val(), 'abc :smile: ');
    assert(textbox.focused);

    textbox.blur();
    compose_ui.smart_insert(textbox, ':airplane:');
    assert.equal(textbox.insert_text, ':airplane: ');
    assert.equal(textbox.val(), 'abc :smile: :airplane: ');
    assert(textbox.focused);

    textbox.caret(0);
    textbox.blur();
    compose_ui.smart_insert(textbox, ':octopus:');
    assert.equal(textbox.insert_text, ':octopus: ');
    assert.equal(textbox.val(), ':octopus: abc :smile: :airplane: ');
    assert(textbox.focused);

    textbox.caret(textbox.val().length);
    textbox.blur();
    compose_ui.smart_insert(textbox, ':heart:');
    assert.equal(textbox.insert_text, ':heart: ');
    assert.equal(textbox.val(), ':octopus: abc :smile: :airplane: :heart: ');
    assert(textbox.focused);

    // Test handling of spaces for ```quote
    textbox = make_textbox('');
    textbox.caret(0);
    textbox.blur();
    compose_ui.smart_insert(textbox, '```quote\nquoted message\n```\n');
    assert.equal(textbox.insert_text, '```quote\nquoted message\n```\n');
    assert.equal(textbox.val(), '```quote\nquoted message\n```\n');
    assert(textbox.focused);

    textbox = make_textbox('');
    textbox.caret(0);
    textbox.blur();
    compose_ui.smart_insert(textbox, "[Quoting…]\n");
    assert.equal(textbox.insert_text, '[Quoting…]\n');
    assert.equal(textbox.val(), '[Quoting…]\n');
    assert(textbox.focused);

    textbox = make_textbox('abc');
    textbox.caret(3);
    textbox.blur();
    compose_ui.smart_insert(textbox, " test with space");
    assert.equal(textbox.insert_text, ' test with space ');
    assert.equal(textbox.val(), 'abc test with space ');
    assert(textbox.focused);

    // Note that we don't have any special logic for strings that are
    // already surrounded by spaces, since we are usually inserting things
    // like emojis and file links.
});

run_test('replace_syntax', () => {
    $('#compose-textarea').val('abcabc');

    compose_ui.replace_syntax('a', 'A');
    assert.equal($('#compose-textarea').val(), 'Abcabc');

    compose_ui.replace_syntax(/b/g, 'B');
    assert.equal($('#compose-textarea').val(), 'ABcaBc');

    // Verify we correctly handle `$`s in the replacement syntax
    compose_ui.replace_syntax('Bca', '$$\pi$$');
    assert.equal($('#compose-textarea').val(), 'A$$\pi$$Bc');
});

run_test('compute_placeholder_text', () => {
    var opts = {
        message_type: 'stream',
        stream: '',
        topic: '',
        private_message_recipient: '',
    };

    // Stream narrows
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Compose your message here"));

    opts.stream = "all";
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Message #all"));

    opts.topic = "Test";
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Message #all > Test"));

    // PM Narrows
    opts = {
        message_type: 'private',
        stream: '',
        topic: '',
        private_message_recipient: '',
    };
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Compose your message here"));

    opts.private_message_recipient = 'bob@yakkl.com';
    user_status.set_status_text({
        user_id: bob.user_id,
        status_text: 'out to lunch',
    });
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Message Bob (out to lunch)"));

    opts.private_message_recipient = 'alice@yakkl.com';
    user_status.set_status_text({
        user_id: alice.user_id,
        status_text: '',
    });
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Message Alice"));

    // Group PM
    opts.private_message_recipient = 'alice@yakkl.com,bob@yakkl.com';
    assert.equal(compose_ui.compute_placeholder_text(opts), i18n.t("Message Alice, Bob"));
});