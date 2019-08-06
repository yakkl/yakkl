set_global('page_params', {
    search_pills_enabled: false,
});
zrequire('util');
zrequire('typeahead_helper');
set_global('Handlebars', global.make_handlebars());
zrequire('Filter', 'js/filter');
zrequire('narrow_state');
zrequire('stream_data');
zrequire('topic_data');
zrequire('people');
zrequire('unread');
zrequire('common');
var search = zrequire('search_suggestion');

var bob = {
    email: 'bob@yakkl.com',
    full_name: 'Bob Roberts',
    user_id: 42,
};


function init() {
    people.init();
    people.add(bob);
    people.initialize_current_user(bob.user_id);
}
init();

set_global('narrow', {});
set_global('settings_org', {
    show_email: () => true,
});

topic_data.reset();

run_test('basic_get_suggestions', () => {
    var query = 'fred';

    global.stream_data.subscribed_streams = function () {
        return [];
    };

    global.narrow_state.stream = function () {
        return 'office';
    };

    var suggestions = search.get_suggestions_legacy(query);

    var expected = [
        'fred',
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('subset_suggestions', () => {
    var query = 'stream:Denmark topic:Hamlet shakespeare';

    global.stream_data.subscribed_streams = function () {
        return [];
    };

    global.narrow_state.stream = function () {
        return;
    };

    var suggestions = search.get_suggestions_legacy(query);

    var expected = [
        "stream:Denmark topic:Hamlet shakespeare",
        "stream:Denmark topic:Hamlet",
        "stream:Denmark",
    ];

    assert.deepEqual(suggestions.strings, expected);
});

run_test('private_suggestions', () => {
    global.stream_data.subscribed_streams = function () {
        return [];
    };

    global.narrow_state.stream = function () {
        return;
    };

    var ted =
    {
        email: 'ted@yakkl.com',
        user_id: 101,
        full_name: 'Ted Smith',
    };

    var alice =
    {
        email: 'alice@yakkl.com',
        user_id: 102,
        full_name: 'Alice Ignore',
    };

    people.add(ted);
    people.add(alice);

    var query = 'is:private';
    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        "is:private",
        "pm-with:alice@yakkl.com",
        "pm-with:bob@yakkl.com",
        "pm-with:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'is:private al';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:private al",
        "is:private is:alerted",
        "is:private sender:alice@yakkl.com",
        "is:private pm-with:alice@yakkl.com",
        "is:private group-pm-with:alice@yakkl.com",
        "is:private",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'pm-with:t';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:t",
        "pm-with:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-pm-with:t';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-pm-with:t",
        "is:private -pm-with:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'pm-with:ted@yakkl.com';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:ted';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "sender:ted",
        "sender:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:te';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "sender:te",
        "sender:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-sender:te';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-sender:te",
        "-sender:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:ted@yakkl.com';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "sender:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'is:unread from:ted';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:unread from:ted",
        "is:unread from:ted@yakkl.com",
        "is:unread",
    ];
    assert.deepEqual(suggestions.strings, expected);


    // Users can enter bizarre queries, and if they do, we want to
    // be conservative with suggestions.
    query = 'is:private near:3';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:private near:3",
        "is:private",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'pm-with:ted@yakkl.com near:3';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:ted@yakkl.com near:3",
        "pm-with:ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Make sure suggestions still work if preceding tokens
    query = 'is:alerted sender:ted@yakkl.com';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:alerted sender:ted@yakkl.com",
        "is:alerted",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'is:starred has:link is:private al';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:starred has:link is:private al",
        "is:starred has:link is:private is:alerted",
        "is:starred has:link is:private sender:alice@yakkl.com",
        "is:starred has:link is:private pm-with:alice@yakkl.com",
        "is:starred has:link is:private group-pm-with:alice@yakkl.com",
        "is:starred has:link is:private",
        "is:starred has:link",
        "is:starred",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Make sure it handles past context correctly
    query = 'stream:Denmark pm-with:';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'stream:Denmark pm-with:',
        'stream:Denmark',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:ted@yakkl.com sender:';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'sender:ted@yakkl.com sender:',
        'sender:ted@yakkl.com',
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('group_suggestions', () => {
    global.stream_data.subscribed_streams = function () {
        return [];
    };

    global.narrow_state.stream = function () {
        return;
    };

    set_global('activity', {
        get_huddles: function () {
            return [];
        },
    });

    var ted =
    {
        email: 'ted@yakkl.com',
        user_id: 101,
        full_name: 'Ted Smith',
    };

    var alice =
    {
        email: 'alice@yakkl.com',
        user_id: 102,
        full_name: 'Alice Ignore',
    };

    var jeff =
    {
        email: 'jeff@yakkl.com',
        user_id: 103,
        full_name: 'Jeff Zoolipson',
    };

    people.add(ted);
    people.add(alice);
    people.add(jeff);

    // Entering a comma in a pm-with query should immediately generate
    // suggestions for the next person.
    var query = 'pm-with:bob@yakkl.com,';
    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        "pm-with:bob@yakkl.com,",
        "pm-with:bob@yakkl.com,alice@yakkl.com",
        "pm-with:bob@yakkl.com,jeff@yakkl.com",
        "pm-with:bob@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Only the last part of a comma-separated pm-with query should be used to
    // generate suggestions.
    query = 'pm-with:bob@yakkl.com,t';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:bob@yakkl.com,t",
        "pm-with:bob@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Smit should also generate ted@yakkl.com (Ted Smith) as a suggestion.
    query = 'pm-with:bob@yakkl.com,Smit';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:bob@yakkl.com,Smit",
        "pm-with:bob@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Do not suggest "bob@yakkl.com" (the name of the current user)
    query = 'pm-with:ted@yakkl.com,bo';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:ted@yakkl.com,bo",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // No superfluous suggestions should be generated.
    query = 'pm-with:bob@yakkl.com,red';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:bob@yakkl.com,red",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // is:private should be properly prepended to each suggestion if the pm-with
    // operator is negated.

    query = '-pm-with:bob@yakkl.com,';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-pm-with:bob@yakkl.com,",
        "is:private -pm-with:bob@yakkl.com,alice@yakkl.com",
        "is:private -pm-with:bob@yakkl.com,jeff@yakkl.com",
        "is:private -pm-with:bob@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-pm-with:bob@yakkl.com,t';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-pm-with:bob@yakkl.com,t",
        "is:private -pm-with:bob@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-pm-with:bob@yakkl.com,Smit';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-pm-with:bob@yakkl.com,Smit",
        "is:private -pm-with:bob@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-pm-with:bob@yakkl.com,red';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-pm-with:bob@yakkl.com,red",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // Test multiple operators
    query = 'is:starred has:link pm-with:bob@yakkl.com,Smit';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:starred has:link pm-with:bob@yakkl.com,Smit",
        "is:starred has:link pm-with:bob@yakkl.com,ted@yakkl.com",
        "is:starred has:link",
        "is:starred",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'stream:Denmark has:link pm-with:bob@yakkl.com,Smit';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "stream:Denmark has:link pm-with:bob@yakkl.com,Smit",
        "stream:Denmark has:link",
        "stream:Denmark",
    ];
    assert.deepEqual(suggestions.strings, expected);

    set_global('activity', {
        get_huddles: function () {
            return ['101,42', '101,103,42'];
        },
    });

    // Simulate a past huddle which should now prioritize ted over alice
    query = 'pm-with:bob@yakkl.com,';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:bob@yakkl.com,",
        "pm-with:bob@yakkl.com,ted@yakkl.com",
        "pm-with:bob@yakkl.com,alice@yakkl.com",
        "pm-with:bob@yakkl.com,jeff@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // bob,ted,jeff is already an existing huddle, so prioritize this one
    query = 'pm-with:bob@yakkl.com,ted@yakkl.com,';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:bob@yakkl.com,ted@yakkl.com,",
        "pm-with:bob@yakkl.com,ted@yakkl.com,jeff@yakkl.com",
        "pm-with:bob@yakkl.com,ted@yakkl.com,alice@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // bob,ted,jeff is already an existing huddle, but if we start with just bob,
    // then don't prioritize ted over alice because it doesn't complete the full huddle.
    query = 'pm-with:jeff@yakkl.com,';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:jeff@yakkl.com,",
        "pm-with:jeff@yakkl.com,alice@yakkl.com",
        "pm-with:jeff@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = "pm-with:jeff@yakkl.com,ted@yakkl.com hi";
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "pm-with:jeff@yakkl.com,ted@yakkl.com hi",
        "pm-with:jeff@yakkl.com,ted@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

});

init();

run_test('empty_query_suggestions', () => {
    var query = '';

    global.stream_data.subscribed_streams = function () {
        return ['devel', 'office'];
    };

    global.narrow_state.stream = function () {
        return;
    };

    var suggestions = search.get_suggestions_legacy(query);

    var expected = [
        "",
        "is:private",
        "is:starred",
        "is:mentioned",
        "is:alerted",
        "is:unread",
        "sender:bob@yakkl.com",
        "stream:devel",
        "stream:office",
        'has:link',
        'has:image',
        'has:attachment',
    ];

    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table[q].description;
    }
    assert.equal(describe('is:private'), 'Private messages');
    assert.equal(describe('is:starred'), 'Starred messages');
    assert.equal(describe('is:mentioned'), '@-mentions');
    assert.equal(describe('is:alerted'), 'Alerted messages');
    assert.equal(describe('is:unread'), 'Unread messages');
    assert.equal(describe('sender:bob@yakkl.com'), 'Sent by me');
    assert.equal(describe('has:link'), 'Messages with one or more link');
    assert.equal(describe('has:image'), 'Messages with one or more image');
    assert.equal(describe('has:attachment'), 'Messages with one or more attachment');
});

run_test('has_suggestions', () => {
    // Checks that category wise suggestions are displayed instead of a single
    // default suggestion when suggesting `has` operator.
    var query = 'h';
    global.stream_data.subscribed_streams = function () {
        return ['devel', 'office'];
    };
    global.narrow_state.stream = function () {
        return;
    };

    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        "h",
        'has:link',
        'has:image',
        'has:attachment',
    ];
    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table[q].description;
    }

    assert.equal(describe('has:link'), 'Messages with one or more link');
    assert.equal(describe('has:image'), 'Messages with one or more image');
    assert.equal(describe('has:attachment'), 'Messages with one or more attachment');

    query = '-h';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-h",
        '-has:link',
        '-has:image',
        '-has:attachment',
    ];
    assert.deepEqual(suggestions.strings, expected);
    assert.equal(describe('-has:link'), 'Exclude messages with one or more link');
    assert.equal(describe('-has:image'), 'Exclude messages with one or more image');
    assert.equal(describe('-has:attachment'), 'Exclude messages with one or more attachment');

    // operand suggestions follow.

    query = 'has:';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'has:link',
        'has:image',
        'has:attachment',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'has:im';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'has:image',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-has:im';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        '-has:image',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'att';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'att',
        'has:attachment',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'stream:Denmark is:alerted has:lin';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'stream:Denmark is:alerted has:link',
        'stream:Denmark is:alerted',
        'stream:Denmark',
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('check_is_suggestions', () => {
    var query = 'i';
    global.stream_data.subscribed_streams = function () {
        return ['devel', 'office'];
    };
    global.narrow_state.stream = function () {
        return;
    };

    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        'i',
        'is:private',
        'is:starred',
        'is:mentioned',
        'is:alerted',
        'is:unread',
        'has:image',
    ];
    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table[q].description;
    }

    assert.equal(describe('is:private'), 'Private messages');
    assert.equal(describe('is:starred'), 'Starred messages');
    assert.equal(describe('is:mentioned'), '@-mentions');
    assert.equal(describe('is:alerted'), 'Alerted messages');
    assert.equal(describe('is:unread'), 'Unread messages');

    query = '-i';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        '-i',
        '-is:private',
        '-is:starred',
        '-is:mentioned',
        '-is:alerted',
        '-is:unread',
    ];
    assert.deepEqual(suggestions.strings, expected);

    assert.equal(describe('-is:private'), 'Exclude private messages');
    assert.equal(describe('-is:starred'), 'Exclude starred messages');
    assert.equal(describe('-is:mentioned'), 'Exclude @-mentions');
    assert.equal(describe('-is:alerted'), 'Exclude alerted messages');
    assert.equal(describe('-is:unread'), 'Exclude unread messages');

    // operand suggestions follow.

    query = 'is:';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'is:private',
        'is:starred',
        'is:mentioned',
        'is:alerted',
        'is:unread',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'is:st';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'is:starred',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-is:st';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        '-is:starred',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'st';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'st',
        'is:starred',
        'stream:',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'stream:Denmark has:link is:sta';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'stream:Denmark has:link is:starred',
        'stream:Denmark has:link',
        'stream:Denmark',
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('sent_by_me_suggestions', () => {
    global.stream_data.subscribed_streams = function () {
        return [];
    };

    global.narrow_state.stream = function () {
        return;
    };

    var query = '';
    var suggestions = search.get_suggestions_legacy(query);
    assert(suggestions.strings.indexOf('sender:bob@yakkl.com') !== -1);
    assert.equal(suggestions.lookup_table['sender:bob@yakkl.com'].description,
                 'Sent by me');

    query = 'sender';
    suggestions = search.get_suggestions_legacy(query);
    var expected = [
        "sender",
        "sender:bob@yakkl.com",
        "sender:",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-sender';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-sender",
        "-sender:bob@yakkl.com",
        "-sender:",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'from';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "from",
        "from:bob@yakkl.com",
        "from:",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-from';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-from",
        "-from:bob@yakkl.com",
        "-from:",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:bob@yakkl.com';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "sender:bob@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'from:bob@yakkl.com';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "from:bob@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sent';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "sent",
        "sender:bob@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-sent';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-sent",
        "-sender:bob@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'stream:Denmark topic:Denmark1 sent';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "stream:Denmark topic:Denmark1 sent",
        "stream:Denmark topic:Denmark1 sender:bob@yakkl.com",
        "stream:Denmark topic:Denmark1",
        "stream:Denmark",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'is:starred sender:m';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "is:starred sender:m",
        "is:starred sender:bob@yakkl.com",
        "is:starred",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:alice@yakkl.com sender:';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "sender:alice@yakkl.com sender:",
        "sender:alice@yakkl.com",
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('topic_suggestions', () => {
    var suggestions;
    var expected;

    global.stream_data.subscribed_streams = function () {
        return ['office'];
    };

    global.narrow_state.stream = function () {
        return 'office';
    };

    var devel_id = 44;
    var office_id = 77;

    global.stream_data.get_stream_id = function (stream_name) {
        switch (stream_name) {
        case 'office': return office_id;
        case 'devel': return devel_id;
        }
    };

    topic_data.reset();
    suggestions = search.get_suggestions_legacy('te');
    expected = [
        "te",
    ];
    assert.deepEqual(suggestions.strings, expected);

    topic_data.add_message({
        stream_id: devel_id,
        topic_name: 'REXX',
    });

    _.each(['team', 'ignore', 'test'], function (topic_name) {
        topic_data.add_message({
            stream_id: office_id,
            topic_name: topic_name,
        });
    });

    suggestions = search.get_suggestions_legacy('te');
    expected = [
        "te",
        "stream:office topic:team",
        "stream:office topic:test",
    ];
    assert.deepEqual(suggestions.strings, expected);

    function describe(q) {
        return suggestions.lookup_table[q].description;
    }
    assert.equal(describe('te'), "Search for te");
    assert.equal(describe('stream:office topic:team'), "Stream office &gt; team");

    suggestions = search.get_suggestions_legacy('topic:staplers stream:office');
    expected = [
        'topic:staplers stream:office',
        'topic:staplers',
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = search.get_suggestions_legacy('stream:devel topic:');
    expected = [
        'stream:devel topic:',
        'stream:devel topic:REXX',
        'stream:devel',
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = search.get_suggestions_legacy('stream:devel -topic:');
    expected = [
        'stream:devel -topic:',
        'stream:devel -topic:REXX',
        'stream:devel',
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = search.get_suggestions_legacy('-topic:te');
    expected = [
        '-topic:te',
        'stream:office -topic:team',
        'stream:office -topic:test',
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = search.get_suggestions_legacy('is:alerted stream:devel is:starred topic:');
    expected = [
        'is:alerted stream:devel is:starred topic:',
        'is:alerted stream:devel is:starred topic:REXX',
        'is:alerted stream:devel is:starred',
        'is:alerted stream:devel',
        'is:alerted',
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = search.get_suggestions_legacy('is:private stream:devel topic:');
    expected = [
        'is:private stream:devel topic:',
        'is:private stream:devel',
        'is:private',
    ];
    assert.deepEqual(suggestions.strings, expected);

    suggestions = search.get_suggestions_legacy('topic:REXX stream:devel topic:');
    expected = [
        'topic:REXX stream:devel topic:',
        'topic:REXX stream:devel',
        'topic:REXX',
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('whitespace_glitch', () => {
    var query = 'stream:office '; // note trailing space

    global.stream_data.subscribed_streams = function () {
        return ['office'];
    };

    global.narrow_state.stream = function () {
        return;
    };

    topic_data.reset();

    var suggestions = search.get_suggestions_legacy(query);

    var expected = [
        "stream:office",
    ];

    assert.deepEqual(suggestions.strings, expected);
});

run_test('stream_completion', () => {
    global.stream_data.subscribed_streams = function () {
        return ['office', 'dev help'];
    };

    global.narrow_state.stream = function () {
        return;
    };

    topic_data.reset();

    var query = 'stream:of';
    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        "stream:of",
        "stream:office",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-stream:of';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "-stream:of",
        "-stream:office",
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'hel';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "hel",
        "stream:dev+help",
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('people_suggestions', () => {
    var query = 'te';

    global.stream_data.subscribed_streams = function () {
        return [];
    };

    global.narrow_state.stream = function () {
        return;
    };

    var ted = {
        email: 'ted@yakkl.com',
        user_id: 201,
        full_name: 'Ted Smith',
    };

    var bob = {
        email: 'bob@yakkl.com',
        user_id: 202,
        full_name: 'Bob Térry',
    };

    var alice = {
        email: 'alice@yakkl.com',
        user_id: 203,
        full_name: 'Alice Ignore',
    };
    people.add(ted);
    people.add(bob);
    people.add(alice);


    topic_data.reset();

    var suggestions = search.get_suggestions_legacy(query);

    var expected = [
        "te",
        "sender:bob@yakkl.com",
        "sender:ted@yakkl.com",
        "pm-with:bob@yakkl.com", // bob térry
        "pm-with:ted@yakkl.com",
        "group-pm-with:bob@yakkl.com",
        "group-pm-with:ted@yakkl.com",
    ];

    assert.deepEqual(suggestions.strings, expected);
    function describe(q) {
        return suggestions.lookup_table[q].description;
    }
    assert.equal(describe('pm-with:ted@yakkl.com'),
                 "Private messages with <strong>Te</strong>d Smith &lt;<strong>te</strong>d@yakkl.com&gt;");
    assert.equal(describe('sender:ted@yakkl.com'),
                 "Sent by <strong>Te</strong>d Smith &lt;<strong>te</strong>d@yakkl.com&gt;");

    suggestions = search.get_suggestions_legacy('Ted '); // note space

    expected = [
        "Ted",
        "sender:ted@yakkl.com",
        "pm-with:ted@yakkl.com",
        "group-pm-with:ted@yakkl.com",
    ];

    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:ted sm';
    expected = [
        'sender:ted+sm',
        'sender:ted@yakkl.com',
    ];
    suggestions = search.get_suggestions_legacy(query);
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:ted@yakkl.com new';
    expected = [
        'sender:ted@yakkl.com new',
        'sender:ted@yakkl.com',
    ];
    suggestions = search.get_suggestions_legacy(query);
    assert.deepEqual(suggestions.strings, expected);

    query = 'sender:ted@tulip.com new';
    expected = [
        'sender:ted@tulip.com+new',
    ];
    suggestions = search.get_suggestions_legacy(query);
    assert.deepEqual(suggestions.strings, expected);
});

run_test('operator_suggestions', () => {
    // Completed operator should return nothing
    var query = 'stream:';
    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        'stream:',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'st';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'st',
        'is:starred',
        'stream:',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'group-';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'group-',
        'group-pm-with:',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = '-s';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        '-s',
        '-sender:bob@yakkl.com',
        '-stream:',
        '-sender:',
    ];
    assert.deepEqual(suggestions.strings, expected);

    query = 'stream:Denmark is:alerted -f';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        'stream:Denmark is:alerted -f',
        'stream:Denmark is:alerted -from:bob@yakkl.com',
        'stream:Denmark is:alerted -from:',
        'stream:Denmark is:alerted',
        'stream:Denmark',
    ];
    assert.deepEqual(suggestions.strings, expected);
});

run_test('queries_with_spaces', () => {
    global.stream_data.subscribed_streams = function () {
        return ['office', 'dev help'];
    };

    global.narrow_state.stream = function () {
        return;
    };

    topic_data.reset();

    // test allowing spaces with quotes surrounding operand
    var query = 'stream:"dev he"';
    var suggestions = search.get_suggestions_legacy(query);
    var expected = [
        "stream:dev+he",
        "stream:dev+help",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // test mismatched quote
    query = 'stream:"dev h';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "stream:dev+h",
        "stream:dev+help",
    ];
    assert.deepEqual(suggestions.strings, expected);

    // test extra space after operator still works
    query = 'stream: offi';
    suggestions = search.get_suggestions_legacy(query);
    expected = [
        "stream:offi",
        "stream:office",
    ];
    assert.deepEqual(suggestions.strings, expected);
});
