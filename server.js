const path = require('path');
const fs = require('fs');

const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const minify = require('express-minify');
const uglifyEs = require('uglify-es');
const JavaScriptObfuscator = require('javascript-obfuscator');

const session = require('express-session');
const FileStore = require('session-file-store')(session);

const Database = require('./server/database.js');
const Bible = require('./server/bible.js');
const routes = require('./server/routes.js');


class Server {
	/**
	 * Create the server instance.
	 * 
	 * @param {Number} [port=8080] Port to start on.
	 * @param {Object} paths Paths to use.
	 * @param {Boolean} testing Testing flag.
	 */
	constructor(port, paths, testing = false){
		this.port = port || 8080;

		this.paths = Object.assign({
			data: path.join(__dirname, 'data')
		}, paths, {
			root: __dirname
		});

		this.testing = testing;

		this.db;
		this.bible;
		this.express;
		this.httpServer;
	}


	/**
	 * Initalize the server.
	 * 
	 * @returns {Promise<Server>} Server instance to allow for chaining.
	 */
	init(){
		this.express = express();

		if (process.env.NODE_ENV !== 'test') this.express.use(morgan('common'));

		this.express.use(compression());
		this.express.use(minify({
			uglifyJsModule: uglifyEs,
			onerror: (...args) => console.error(...args),
			errorHandler: (...args) => console.error(...args),
		}));
		this.express.get('/index.js', (_, res) => {
			const result = JavaScriptObfuscator.obfuscate(fs.readFileSync(path.join(__dirname, 'client', 'index.js')).toString());
			res.setHeader('Content-Type', 'text/javascript');
			return res.send(result.getObfuscatedCode());
		});

		this.express.use(express.json());
		this.express.use(express.urlencoded({
			extended: true
		}));

		this.express.use(session({
			store: this.testing ? undefined : new FileStore,
			cookie: {
				httpOnly: false
			},
			genid: () => process.hrtime().reduce((total, value) => total + value, 0).toString(),
			secret: '2776209b9d9d72eef92d0910e8c72e13',
			resave: false,
			saveUninitialized: true
		}));
		
		return new Database(this).init().then(db => {
			this.db = db;

			return new Bible(this).init();
		}).then(bible => {
			this.bible = bible;

			routes(this);

			this.express.use(express.static(path.join(__dirname, 'client')));
			
			return this;
		});
	}


	/**
	 * Start the server.
	 * 
	 * @returns {Promise<Server>} Server instance to allow for chaining.
	 */
	start(){
		return new Promise((resolve, reject) => {
			if (!this.express) return reject(new Error('Server has not been initalized'));

			this.httpServer = this.express.listen(this.port, () => {
				console.log(`Starting from ${this.paths.root}`);
				console.log(`Storing data in ${this.paths.data}`);
				if (this.testing) console.log('Starting in testing mode');
				console.log(`Listening on port ${this.port}`);
				return resolve(this);
			}).on('error', reject);
		});
	}


	/**
	 * Stop the server.
	 * 
	 * @returns {Promise<Server>} Server instance to allow for chaining.
	 */
	stop(){
		if (!this.httpServer) return Promise.reject(new Error('Server has not been started'));

		return new Promise(resolve => this.httpServer.close(resolve));
	}
}

module.exports = (function run(){
	if (require.main !== module) return Server;

	const testing = process.argv.some(arg => arg.trim().match(/--test/i));

	return new Server(process.argv[2] || process.env.PORT, {}, testing).init().then(server => server.start());
})();