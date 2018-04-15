const { expect } = require('chai');

const path = require('path');

const Server = require('../server.js')();


describe('Server', () => {
	it('server.js returns function when imported', () => {
		expect(Server).to.be.a('function');
	});

	describe('constructor', () => {
		it('has a default port of 8080', () => {
			const server = new Server();
			expect(server.port).to.equal(8080);
		});
		it('has a customizable port', () => {
			const server = new Server(1234);
			expect(server.port).to.equal(1234);
		});
		it('has default paths', () => {
			const server = new Server();
			expect(server.paths).to.deep.equal({
				root: path.resolve(__dirname, '..'),
				data: path.resolve(__dirname, '..', 'data')
			});
		});
		it('has customizable paths', () => {
			const server = new Server(1234, {
				root: 'invalidroot',
				data: 'newdata'
			});
			expect(server.paths).to.deep.equal({
				root: path.resolve(__dirname, '..'),
				data: 'newdata'
			});
		});
	});

	describe('init', () => {
		it('does not fail', () =>  new Server().init().then(server => {
			expect(server).to.be.a('object');
		}));

		it('initalizes everything', () => new Server().init().then(server => {
			expect(server.express).to.be.a('function');

			expect(server.db).to.be.a('object');
			expect(server.db).to.have.property('driver');

			expect(server.bible).to.be.a('object');
			expect(server.bible).to.have.property('driver');
		}));

		it('starts and stops', () => new Server().init().then(instance => instance.start()).then(instance => instance.stop()));

		it('must be initalized before starting', () => new Server().start()
			.then(() => expect.fail())
			.catch(error => {
				expect(error).to.be.a('error');
				expect(error.toString()).to.equal('Error: Server has not been initalized');
			})
		);
	
		it('must be started before stopping', () => new Server().stop()
			.then(() => expect.fail())
			.catch(error => {
				expect(error).to.be.a('error');
				expect(error.toString()).to.equal('Error: Server has not been started');
			})
		);
	});
});