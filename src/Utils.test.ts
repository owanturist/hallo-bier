import { Nothing, Just } from 'frctl/dist/Maybe';
import * as Utils from './Utils';

describe('parseInt', () => {
    it('Nothing when empty string', () => {
        expect(Utils.parseInt('')).toEqual(Nothing);
    });

    it('Nothing when only -', () => {
        expect(Utils.parseInt('-')).toEqual(Nothing);
    });

    it('Nothing when only +', () => {
        expect(Utils.parseInt('-')).toEqual(Nothing);
    });

    it('Nothing when pad empty left', () => {
        expect(Utils.parseInt(' 0')).toEqual(Nothing);
    });

    it('Nothing when pad empty right', () => {
        expect(Utils.parseInt('0 ')).toEqual(Nothing);
    });

    it('Nothing when pad left', () => {
        expect(Utils.parseInt('a0')).toEqual(Nothing);
    });

    it('Nothing when pad right', () => {
        expect(Utils.parseInt('0a')).toEqual(Nothing);
    });

    it('Nothing when not number between', () => {
        expect(Utils.parseInt('0 1')).toEqual(Nothing);
    });

    it('Nothing when float', () => {
        expect(Utils.parseInt('0.0')).toEqual(Nothing);
        expect(Utils.parseInt('0.1')).toEqual(Nothing);
    });

    it('Just when single number', () => {
        expect(Utils.parseInt('0')).toEqual(Just(0));
    });

    it('Just when multiple number', () => {
        expect(Utils.parseInt('1234')).toEqual(Just(1234));
    });

    it('Just when negate', () => {
        expect(Utils.parseInt('-1234')).toEqual(Just(-1234));
    });

    it('Just when positive', () => {
        expect(Utils.parseInt('+1234')).toEqual(Just(1234));
    });
});

describe('parseDate', () => {
    it('Nothing when empty string', () => {
        expect(Utils.parseDate('')).toEqual(Nothing);
    });

    it('Nothing when not number', () => {
        expect(Utils.parseDate('abc')).toEqual(Nothing);
    });

    it('Nothing when not number', () => {
        expect(Utils.parseDate('abc')).toEqual(Nothing);
    });

    it('Nothing when year is negative', () => {
        expect(Utils.parseDate('-1')).toEqual(Nothing);
    });

    it('Nothing when month out of range', () => {
        expect(Utils.parseDate('0/2017')).toEqual(Nothing);
        expect(Utils.parseDate('13/2017')).toEqual(Nothing);
    });

    it('Just with only year', () => {
        expect(Utils.parseDate('2017')).toEqual(Just(new Date(2017)));
    });

    it('Just with positive year and valid month index', () => {
        expect(Utils.parseDate('1/2019')).toEqual(Just(new Date(2019, 0)));
        expect(Utils.parseDate('12/2019')).toEqual(Just(new Date(2019, 11)));
    });
});
