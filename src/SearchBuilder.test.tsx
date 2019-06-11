import React from 'react';
import { Button, Form, FormControl, Dropdown } from 'react-bootstrap';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Nothing, Just } from 'frctl/dist/Maybe';
import * as MonthPicker from './MonthPicker';
import * as SearchBuilder from './SearchBuilder';

Enzyme.configure({
    adapter: new Adapter()
});

class MonthPickerAction extends MonthPicker.Action {
    public static readonly update = jest.fn<MonthPicker.Stage, [ MonthPicker.State ]>();

    public update(state: MonthPicker.State): MonthPicker.Stage {
        return MonthPickerAction.update(state);
    }
}

it('selectedToString', () => {
    expect(SearchBuilder.selectedToString({ month: MonthPicker.Month.Jan, year: 2010 })).toBe('01/2010');
    expect(SearchBuilder.selectedToString({ month: MonthPicker.Month.Nov, year: 2010 })).toBe('11/2010');
});

describe('selectedFromString', () => {
    it('Nothing with empty string', () => {
        expect(SearchBuilder.selectedFromString('')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString('  ')).toEqual(Nothing);
    });

    it('Nothing with invalid parsing', () => {
        expect(SearchBuilder.selectedFromString('/')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString(' / ')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString('a/b')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString('0/b')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString('a/2000')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString('1.1/2000')).toEqual(Nothing);
        expect(SearchBuilder.selectedFromString('1/2000.1')).toEqual(Nothing);
    });

    it('Just with valid values', () => {
        expect(
            SearchBuilder.selectedFromString('1/2000')
        ).toEqual(
            Just({ month: MonthPicker.Month.Jan, year: 2000 })
        );

        expect(
            SearchBuilder.selectedFromString(' 1 / 2000 ')
        ).toEqual(
            Just({ month: MonthPicker.Month.Jan, year: 2000 })
        );

        expect(
            SearchBuilder.selectedFromString('2 2001')
        ).toEqual(
            Just({ month: MonthPicker.Month.Feb, year: 2001 })
        );

        expect(
            SearchBuilder.selectedFromString(' 2   2001 ')
        ).toEqual(
            Just({ month: MonthPicker.Month.Feb, year: 2001 })
        );

        expect(
            SearchBuilder.selectedFromString('3-2002')
        ).toEqual(
            Just({ month: MonthPicker.Month.Mar, year: 2002 })
        );

        expect(
            SearchBuilder.selectedFromString(' 3 - 2002 ')
        ).toEqual(
            Just({ month: MonthPicker.Month.Mar, year: 2002 })
        );

        expect(
            SearchBuilder.selectedFromString('4_2003')
        ).toEqual(
            Just({ month: MonthPicker.Month.Apr, year: 2003 })
        );
    });
});

describe('State', () => {
    it('init', () => {
        expect(SearchBuilder.init({ name: Nothing, brewedAfter: Nothing })).toEqual({
            name: '',
            brewedAfter: '',
            monthPicker: Nothing
        });

        expect(SearchBuilder.init({
            name: Just('name'),
            brewedAfter: Just(new Date(2000, 4))
        })).toEqual({
            name: 'name',
            brewedAfter: '05/2000',
            monthPicker: Nothing
        });
    });

    it('isValid', () => {
        expect(SearchBuilder.isValid({
            name: '',
            brewedAfter: '',
            monthPicker: Nothing
        })).toBe(false);

        expect(SearchBuilder.isValid({
            name: '   ',
            brewedAfter: '',
            monthPicker: Nothing
        })).toBe(false);

        expect(SearchBuilder.isValid({
            name: '',
            brewedAfter: '04 str',
            monthPicker: Nothing
        })).toBe(false);

        expect(SearchBuilder.isValid({
            name: 'name',
            brewedAfter: '',
            monthPicker: Nothing
        })).toBe(true);

        expect(SearchBuilder.isValid({
            name: '',
            brewedAfter: '2/2000',
            monthPicker: Nothing
        })).toBe(true);

        expect(SearchBuilder.isValid({
            name: 'n',
            brewedAfter: '2/2000',
            monthPicker: Nothing
        })).toBe(true);
    });
});

describe('Stage', () => {
    const pattern = {
        Update: jest.fn(() => 'Update'),
        Search: jest.fn(() => 'Search')
    };

    afterEach(() => {
        pattern.Update.mockClear();
        pattern.Search.mockClear();
    });

    describe('Update', () => {
        it('cata', () => {
            const state = {
                name: '',
                brewedAfter: '',
                monthPicker: Nothing
            };

            expect(new SearchBuilder.Update(state).cata(pattern)).toBe('Update');
            expect(pattern.Update).toBeCalledTimes(1);
            expect(pattern.Update).toBeCalledWith(state);
            expect(pattern.Search).not.toBeCalled();
        });
    });

    describe('Search', () => {
        it('cata', () => {
            const filter = {
                name: Nothing,
                brewedAfter: Nothing
            };

            expect(new SearchBuilder.Search(filter).cata(pattern)).toBe('Search');
            expect(pattern.Update).not.toBeCalled();
            expect(pattern.Search).toBeCalledTimes(1);
            expect(pattern.Search).toBeCalledWith(filter);
        });
    });
});

describe('Action', () => {
    it('ChangeName', () => {
        expect(new SearchBuilder.ChangeName('foo').update({
            name: 'bar',
            brewedAfter: 'baz',
            monthPicker: Nothing
        })).toEqual(new SearchBuilder.Update({
            name: 'foo',
            brewedAfter: 'baz',
            monthPicker: Nothing
        }));
    });

    describe('ChangeBrewedAfter', () => {
        it('invalid value without MonthPicker', () => {
            expect(new SearchBuilder.ChangeBrewedAfter(Nothing, Nothing, 'foo').update({
                name: 'baz',
                brewedAfter: 'bar',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Update({
                name: 'baz',
                brewedAfter: 'foo',
                monthPicker: Nothing
            }));
        });

        it('invalid value with MonthPicker', () => {
            const monthPickerInitialState = MonthPicker.init(2000);

            expect(new SearchBuilder.ChangeBrewedAfter(Nothing, Nothing, 'foo').update({
                name: 'baz',
                brewedAfter: 'bar',
                monthPicker: Just(monthPickerInitialState)
            })).toEqual(new SearchBuilder.Update({
                name: 'baz',
                brewedAfter: 'foo',
                monthPicker: Just(monthPickerInitialState)
            }));
        });

        it('valid value with MonthPicker', () => {
            expect(new SearchBuilder.ChangeBrewedAfter(Nothing, Nothing, '2/2010').update({
                name: 'baz',
                brewedAfter: 'bar',
                monthPicker: Just(MonthPicker.init(2000))
            })).toEqual(new SearchBuilder.Update({
                name: 'baz',
                brewedAfter: '02/2010',
                monthPicker: Just(MonthPicker.init(2010))
            }));
        });

        it('valid limited least value with MonthPicker', () => {
            expect(new SearchBuilder.ChangeBrewedAfter(
                Just({ month: MonthPicker.Month.May, year: 1990 }),
                Just({ month: MonthPicker.Month.Oct, year: 2015 }),
                '2/1980'
            ).update({
                name: 'baz',
                brewedAfter: 'bar',
                monthPicker: Just(MonthPicker.init(2000))
            })).toEqual(new SearchBuilder.Update({
                name: 'baz',
                brewedAfter: '05/1990',
                monthPicker: Just(MonthPicker.init(1990))
            }));
        });

        it('valid limited highest value with MonthPicker', () => {
            expect(new SearchBuilder.ChangeBrewedAfter(
                Just({ month: MonthPicker.Month.May, year: 1990 }),
                Just({ month: MonthPicker.Month.Oct, year: 2015 }),
                '11/2019'
            ).update({
                name: 'baz',
                brewedAfter: 'bar',
                monthPicker: Just(MonthPicker.init(2000))
            })).toEqual(new SearchBuilder.Update({
                name: 'baz',
                brewedAfter: '10/2015',
                monthPicker: Just(MonthPicker.init(2015))
            }));
        });
    });

    describe('SearchBeer', () => {
        it('empty name', () => {
            expect(new SearchBuilder.SearchBeer().update({
                name: '',
                brewedAfter: '',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Search({
                name: Nothing,
                brewedAfter: Nothing
            }));

            expect(new SearchBuilder.SearchBeer().update({
                name: '   ',
                brewedAfter: '',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Search({
                name: Nothing,
                brewedAfter: Nothing
            }));
        });

        it('invalid brewedAfter', () => {
            expect(new SearchBuilder.SearchBeer().update({
                name: '',
                brewedAfter: '01',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Search({
                name: Nothing,
                brewedAfter: Nothing
            }));
        });

        it('valid', () => {
            expect(new SearchBuilder.SearchBeer().update({
                name: 'foo',
                brewedAfter: '02/2010',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Search({
                name: Just('foo'),
                brewedAfter: Just(new Date(2010, 1))
            }));
        });
    });

    describe('ShowMonthPicker', () => {
        it('MonthPicker is already visible', () => {
            expect(new SearchBuilder.ShowMonthPicker().update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(MonthPicker.init(2000))
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(MonthPicker.init(2000))
            }));
        });

        it('init MonthPicker with default 2010', () => {
            expect(new SearchBuilder.ShowMonthPicker().update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(MonthPicker.init(2010))
            }));
        });

        it('init MonthPicker', () => {
            expect(new SearchBuilder.ShowMonthPicker().update({
                name: 'bar',
                brewedAfter: '05/2015',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: '05/2015',
                monthPicker: Just(MonthPicker.init(2015))
            }));
        });
    });

    it('HideMonthPicker', () => {
        expect(new SearchBuilder.HideMonthPicker().update({
            name: 'bar',
            brewedAfter: 'foo',
            monthPicker: Just(MonthPicker.init(2000))
        })).toEqual(new SearchBuilder.Update({
            name: 'bar',
            brewedAfter: 'foo',
            monthPicker: Nothing
        }));
    });

    describe('ActionMonthPicker', () => {
        afterEach(() => {
            MonthPickerAction.update.mockClear();
        });

        it('MonthPicker is hidden', () => {
            expect(SearchBuilder.ActionMonthPicker.cons(new MonthPickerAction()).update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Nothing
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Nothing
            }));
        });

        it('on MonthPicker.Update', () => {
            const monthPickerState = MonthPicker.init(2000);
            const monthPickerNextState = MonthPicker.init(2010);

            MonthPickerAction.update.mockReturnValueOnce(new MonthPicker.Update(monthPickerNextState));

            expect(SearchBuilder.ActionMonthPicker.cons(new MonthPickerAction()).update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(monthPickerState)
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(monthPickerNextState)
            }));

            expect(MonthPickerAction.update).toBeCalledWith(monthPickerState);
        });

        it('on MonthPicker.Select', () => {
            const monthPickerState = MonthPicker.init(2000);

            MonthPickerAction.update.mockReturnValueOnce(
                new MonthPicker.Select(MonthPicker.Month.May, 2010)
            );

            expect(SearchBuilder.ActionMonthPicker.cons(new MonthPickerAction()).update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(monthPickerState)
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: SearchBuilder.selectedToString({ month: MonthPicker.Month.May, year: 2010 }),
                monthPicker: Just(monthPickerState)
            }));

            expect(MonthPickerAction.update).toBeCalledWith(monthPickerState);
        });

        it('on MonthPicker.Unselect', () => {
            const monthPickerState = MonthPicker.init(2000);

            MonthPickerAction.update.mockReturnValueOnce(
                new MonthPicker.Unselect()
            );

            expect(SearchBuilder.ActionMonthPicker.cons(new MonthPickerAction()).update({
                name: 'bar',
                brewedAfter: 'foo',
                monthPicker: Just(monthPickerState)
            })).toEqual(new SearchBuilder.Update({
                name: 'bar',
                brewedAfter: '',
                monthPicker: Just(monthPickerState)
            }));

            expect(MonthPickerAction.update).toBeCalledWith(monthPickerState);
        });
    });
});


describe('View', () => {
    const dispatch = jest.fn<void, [ SearchBuilder.Action ]>();

    afterEach(() => {
        dispatch.mockReset();
    });

    it('renders initial empty state', () => {
        const wrapper = Enzyme.shallow(
            <SearchBuilder.View
                state={{
                    name: '',
                    brewedAfter: '',
                    monthPicker: Nothing
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(Form.Control).prop('value')).toBe('');
        expect(wrapper.find(Button).prop('disabled')).toBe(true);
        expect(
            wrapper
                .find(SearchBuilder.ViewMonthpicker)
                .dive()
                .find(FormControl)
                .prop('value')
        ).toBe('');
        expect(
            wrapper
                .find(SearchBuilder.ViewMonthpicker)
                .dive()
                .find(Dropdown.Menu)
                .length
        ).toBe(0);
    });

    it('renders initial not empty state', () => {
        const wrapper = Enzyme.shallow(
            <SearchBuilder.View
                state={{
                    name: 'foo',
                    brewedAfter: '05/2010',
                    monthPicker: Just(MonthPicker.init(2010))
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(Form.Control).prop('value')).toBe('foo');
        expect(wrapper.find(Button).prop('disabled')).toBe(false);
        expect(
            wrapper
                .find(SearchBuilder.ViewMonthpicker)
                .dive()
                .find(FormControl)
                .prop('value')
        ).toBe('05/2010');
        expect(
            wrapper
                .find(SearchBuilder.ViewMonthpicker)
                .dive()
                .find(Dropdown.Menu)
                .length
        ).toBe(1);
    });

    it('emits ChangeName', () => {
        Enzyme.shallow(
            <SearchBuilder.View
                state={{
                    name: 'foo',
                    brewedAfter: '05/2010',
                    monthPicker: Just(MonthPicker.init(2010))
                }}
                dispatch={dispatch}
            />
        ).find(Form.Control).simulate('change', {
            currentTarget: {
                value: 'bar'
            }
        });

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(new SearchBuilder.ChangeName('bar'));
    });

    it('emits ChangeBrewedAfter', () => {
        const minBrewedAfter = { month: MonthPicker.Month.Jan, year: 1990 };
        const maxBrewedAfter = { month: MonthPicker.Month.Oct, year: 2010 };

        Enzyme.shallow(
            <SearchBuilder.View
                minBrewedAfter={minBrewedAfter}
                maxBrewedAfter={maxBrewedAfter}
                state={{
                    name: 'foo',
                    brewedAfter: '05/2010',
                    monthPicker: Just(MonthPicker.init(2010))
                }}
                dispatch={dispatch}
            />
        ).find(SearchBuilder.ViewMonthpicker).dive().find(Form.Control).simulate('change', {
            currentTarget: {
                value: '04/2010'
            }
        });

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            new SearchBuilder.ChangeBrewedAfter(Just(minBrewedAfter), Just(maxBrewedAfter), '04/2010')
        );
    });

    it('emits SearchBeer', () => {
        Enzyme.shallow(
            <SearchBuilder.View
                state={{
                    name: 'foo',
                    brewedAfter: '',
                    monthPicker: Nothing
                }}
                dispatch={dispatch}
            />
        ).find(Form).simulate('submit', {
            preventDefault: jest.fn()
        });

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(new SearchBuilder.SearchBeer());
    });


    describe('emits ShowMonthPicker', () => {
        it('MonthPicker is visible', () => {
            Enzyme.shallow(
                <SearchBuilder.View
                    state={{
                        name: '',
                        brewedAfter: '',
                        monthPicker: Just(MonthPicker.init(2000))
                    }}
                    dispatch={dispatch}
                />
            ).find(SearchBuilder.ViewMonthpicker).dive().find(Form.Control).simulate('focus');

            expect(dispatch).not.toBeCalled();
        });

        it('MonthPicker is hidden', () => {
            Enzyme.shallow(
                <SearchBuilder.View
                    state={{
                        name: '',
                        brewedAfter: '',
                        monthPicker: Nothing
                    }}
                    dispatch={dispatch}
                />
            ).find(SearchBuilder.ViewMonthpicker).dive().find(Form.Control).simulate('focus');

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(new SearchBuilder.ShowMonthPicker());
        });
    });
});
