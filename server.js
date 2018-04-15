const path = require('path');

const express = require('express');
const morgan = require('morgan');


const Database = require('./server/database.js');
const Bible = require('./server/bible.js');
const routes = require('./server/routes.js');


class Server {
	constructor(port, paths){
		this.port = port || 8080;

		this.paths = Object.assign({
			data: path.join(__dirname, 'data')
		}, paths, {
			root: __dirname
		});

		this.db;
		this.bible;
		this.express;
		this.httpServer;
	}

	init(){
		this.express = express();

		this.express.use(morgan('common'));

		return new Database(this).init().then(db => {
			this.db = db;

			return new Bible(this).init();
		}).then(bible => {
			this.bible = bible;
			this.express.use(express.static(path.join(__dirname, 'client')));

			routes(this);
			
			return this;
		});
	}

	start(){
		return new Promise((resolve, reject) => {
			if (!this.express) return reject(new Error('Server has not been initalized'));

			this.httpServer = this.express.listen(this.port, () => {
				console.log(`Starting from ${this.paths.root}`);
				console.log(`Storing data in ${this.paths.data}`);
				console.log(`Listening on port ${this.port}`);
				return resolve(this);
			}).on('error', reject);
		});
	}

	stop(){
		if (!this.httpServer) return Promise.reject(new Error('Server has not been started'));

		return new Promise(resolve => this.httpServer.close(resolve));
	}
}

module.exports = function run(){
	if (require.main !== module) return Server;

	return new Server(process.argv[2] || process.env.PORT).init().then(server => server.start()).catch(console.error);
};

module.exports();