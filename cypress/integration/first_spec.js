const { expect } = require('chai');

it('server is responding', () => {
	return cy.request('/api').then(response => {
		expect(response.body).to.have.property('success', true);
		expect(response.body).to.have.property('data');
	
		const verse = response.body.data;
		expect(verse).to.be.a('object');
		expect(verse).to.have.property('translation', 1);
		expect(verse.text).to.be.a('string');
		expect(verse.book).to.be.at.least(1).and.at.most(66);
	});
});

describe('page', () => {
	beforeEach(() => cy.visit('/'));

	it('should load HTML', () => {
		cy.title().should('equal', 'Bible Trivia');
		cy.get('h1').should('have.text', 'Bible Trivia');
	});

	it('vue app is loaded', () => {
		cy.get('#vue-app').should(element => expect(element[0]).to.have.property('__vue__'));
		cy.window().should('have.property', 'app');
	});

	describe('new game menu', () => {
		it('is shown', () => {
			cy.get('#start-menu').find('input[type="checkbox"]').should(checkboxes => {
				expect(checkboxes[0].checked).to.equal(true);
				expect(checkboxes[1].checked).to.equal(true);
			});
			cy.get('#start-menu').find('button');
		});

		it('button is disabled without a testament checked', () => {
			cy.get('input[type="checkbox"]').each(checkbox => checkbox.click());
			cy.get('#start-menu').find('button').should('be.disabled');
		});

		describe('testaments', () => {
			it('old', () => {
				cy.get('#start-menu').find('input[type="checkbox"]').eq(1).click();
				cy.get('#start-menu').find('button').click();
				cy.get('#book-list').children().should('have.length', 39);
			});
			it('new', () => {
				cy.get('#start-menu').find('input[type="checkbox"]').eq(0).click();
				cy.get('#start-menu').find('button').click();
				cy.get('#book-list').children().should('have.length', 27);
			});
		});
	});

	describe('gameplay', () => {
		it('new game button works', () => {
			cy.get('#start-menu').find('button').click();
			cy.get('#new-game-button').click();
			cy.get('#start-menu');
		});

		it('message box works', () => {
			cy.get('#start-menu').find('button').click();
			cy.get('#message-box').should('have.text', 'Starting new game...');
			cy.get('#message-box').click();
			cy.get('#message-box').should('not.exist');
		});

		it('books can be filtered', () => {
			cy.get('#start-menu').find('button').click();
			cy.get('#game').find('input[placeholder="Book"]').type('John');
			cy.get('#book-list').children().should('have.length', 4);
		});

		it('lives decrement', () => {
			cy.get('#start-menu').find('button').click();
			cy.get('#lives').should('have.text', '5');
			cy.get('#book-list').children().eq(64).click();
			cy.get('#lives').should('have.text', '4');
			cy.get('#book-list').children().eq(64).should('have.class', 'wrong-book');
		});

		it('game is lost', () => {
			cy.get('#start-menu').find('button').click();
			cy.get('#lives').should('have.text', '5');

			[63, 62, 56, 30, 64].forEach(short => cy.get('#book-list').children().eq(short).click());

			cy.get('#lives').should('have.text', '0');
			cy.get('#message-box').should('have.text', 'There\'s always next time...');

			cy.get('.actual-book');

			cy.get('#book-list').children().eq(0).click();
			cy.get('.wrong-book').should('have.length', 5);
		});
	});
});