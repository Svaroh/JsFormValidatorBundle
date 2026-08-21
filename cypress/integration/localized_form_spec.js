const submitForm = () => {
    cy.get('#localized_form_save').click();
};

const getParent = (id) => cy.get('#' + id).parent().find('.form-errors');

const getErrors = (id) => getParent(id).children();

const fill = (id, value) => {
    cy.get('#' + id).clear().type(value).should('have.value', value);
};

context('JsFormValidatorBundle with a comma as the decimal separator', () => {
    beforeEach(() => {
        cy.visit('/it/localized')
    });

    describe('test localized number validation', () => {
        it('test number', () => {
            const fieldId = 'localized_form_amount';
            fill(fieldId, '1.234,5');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-amount').contains('Amount must be between 1.5 and 1000.5');

            fill(fieldId, '1,2');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-amount').contains('Amount must be between 1.5 and 1000.5');

            fill(fieldId, '12,5');
            submitForm();
            getErrors(fieldId).should('have.length', 0);

            fill(fieldId, '999,5');
            submitForm();
            getErrors(fieldId).should('have.length', 0);
        });

        it('test number invalid message', () => {
            const fieldId = 'localized_form_amount';
            fill(fieldId, 'abc');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-amount').contains('Please fill a valid number');

            fill(fieldId, '12.5');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-amount').contains('Please fill a valid number');

            fill(fieldId, '12,5');
            submitForm();
            getErrors(fieldId).should('have.length', 0);
        });

        it('test integer', () => {
            const fieldId = 'localized_form_quantity';
            fill(fieldId, '2.500');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-quantity').contains('Quantity must not exceed 2000');

            fill(fieldId, '12,5');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-quantity').contains('Please fill a valid integer');

            fill(fieldId, '1.234');
            submitForm();
            getErrors(fieldId).should('have.length', 0);
        });

        it('test money', () => {
            const fieldId = 'localized_form_price';
            fill(fieldId, '9,99');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-price').contains('Price must be greater than 10');

            fill(fieldId, '12,50');
            submitForm();
            getErrors(fieldId).should('have.length', 0);
        });

        it('test percent', () => {
            const fieldId = 'localized_form_discount';
            fill(fieldId, '150');
            submitForm();
            getErrors(fieldId).should('have.length', 1);
            cy.get('.form-error-localized-form-discount').contains('Discount must be between 0 and 1');

            fill(fieldId, '12,5');
            submitForm();
            getErrors(fieldId).should('have.length', 0);
        });
    });
});
