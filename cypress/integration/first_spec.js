it('random verse is returned from API', function(){
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

it('loads index.html', function(){
	cy.visit('/');
	cy.title().should('eq', 'Bible Trivia');
	cy.get('h1').should('have.text', 'Welcome to Bible Trivia');
});