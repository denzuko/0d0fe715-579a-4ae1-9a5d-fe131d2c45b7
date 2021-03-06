var paths = {
	blog: '_posts/blog/',
	team: '_posts/team/'
    },
    dirs  = Object.keys(paths),
    posts = dirs.reduce(function(prev, dir, index, list) {
	var path = paths[dir];

	describe(path, function() {
	    prev[dir] = readDir(path);
	});
	return prev;
    }, {});

dirs.forEach(function(dir) {
    var path = paths[dir];

    describe(path, function() {
	posts[dir].forEach(function(post) {
	    it(post.name, tests[dir](post));
	});
    });
});

function readPost(dir, filename) {
    var buffer = fs.readFileSync(dir + filename),
        file = buffer.toString('utf8');

    try {
        var parts = file.split('---'),
            frontmatter = parts[1];

        it(filename, function() {
            assert.doesNotThrow(function() { jsyaml.load(frontmatter); });
        });

        return {
            name: filename,
            file: file,
            metadata: jsyaml.load(frontmatter),
            content: parts[2]
        };
    } catch(err) {}
}

function readDir(dir) {
    return fs.readdirSync(dir).map(function(filename) {
        return readPost(dir, filename);
    });
}

var tests = {
    'blog': function(dir, file) {
        return function() {
            var file = post.file,
                metadata = post.metadata,
                content = post.content,
                keys = [
                'published', 'date',
                'layout', 'category',
                'title', 'image',
                'permalink', 'tags'];

            // HTTPS images & iframes in blog
            var urls = file.match(/https?:\/\/[\w,%-\/\.]+\/?/g);
            if (urls) urls.forEach(function(url) {
                assert.ok(!(/http:[^'\"]+\.(jpg|png|gif)/).test(url), url + ' should be https');
            });

            var iframes = file.match(/<iframe [^>]*src=[\"'][^\"']+/g);
            if (iframes) iframes.forEach(function(iframe) {
                assert.ok(!(/<iframe [^>]*src=[\"']http:/).test(iframe), iframe + ' should be https');
                assert.ok(!(/<iframe [^>]*src=[\"']https:\/\/[abcd]\.tiles\.mapbox\.com.*\.html[^\?]/).test(iframe), iframe + ' is insecure embedded map (add ?secure=1)');
            });

            assert.equal(typeof metadata, 'object');
            assert.ok('layout' in metadata, missing('layout'));
            assert.ok('category' in metadata, missing('category'));
            assert.ok('title' in metadata, missing('title'));
            assert.ok('image' in metadata, missing('image'));
            assert.ok('permalink' in metadata, missing('permalink'));
            assert.ok('tags' in metadata, missing('tags'));

            if (metadata.date) {
                assert.ok(metadata.date instanceof Date, invalid('date', metadata.date));
            }

            assert.equal(metadata.category, 'blog', invalid('category', metadata.category));
            assert.ok(isImage(metadata.image), invalid('image', metadata.image));
            assert.ok(/^\/blog\//.test(metadata.permalink), invalid('permalink', metadata.permalink));

            assert.ok(content.indexOf('<!--more-->') !== -1, missing('<!--more-->'));

            var extraKeys = Object.keys(metadata).diff(keys);
            assert.deepEqual(extraKeys, [], extraneous(extraKeys));
        };
    }
};
