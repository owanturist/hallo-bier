import React from 'react';
import {
    InputGroup,
    FormControl,
    Button
} from 'react-bootstrap';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Nothing, Just } from 'frctl/dist/Maybe';
import * as MonthPicker from './MonthPicker';

Enzyme.configure({
    adapter: new Adapter()
});

describe('Month', () => {
    describe('fromIndex', () => {
        it('Nothing when index is float', () => {
            expect(MonthPicker.Month.fromIndex(1.01)).toEqual(Nothing);
            expect(MonthPicker.Month.fromIndex(1.000000000000001)).toEqual(Nothing);
            expect(MonthPicker.Month.fromIndex(1.0000000000000001)).toEqual(Just(MonthPicker.Month.Jan));
        });

        it('Nothing when index is out of range', () => {
            expect(MonthPicker.Month.fromIndex(0)).toEqual(Nothing);
            expect(MonthPicker.Month.fromIndex(-1)).toEqual(Nothing);
            expect(MonthPicker.Month.fromIndex(13)).toEqual(Nothing);
            expect(MonthPicker.Month.fromIndex(14)).toEqual(Nothing);
        });

        it('Just with correct index', () => {
            expect(MonthPicker.Month.fromIndex(1)).toEqual(Just(MonthPicker.Month.Jan));
            expect(MonthPicker.Month.fromIndex(2)).toEqual(Just(MonthPicker.Month.Feb));
            expect(MonthPicker.Month.fromIndex(12)).toEqual(Just(MonthPicker.Month.Dec));
        });
    });

    it('fromDate', () => {
        expect(MonthPicker.Month.fromDate(new Date(2017, -1))).toEqual(MonthPicker.Month.Dec);
        expect(MonthPicker.Month.fromDate(new Date(2017, 0))).toEqual(MonthPicker.Month.Jan);
        expect(MonthPicker.Month.fromDate(new Date(2017, 11))).toEqual(MonthPicker.Month.Dec);
        expect(MonthPicker.Month.fromDate(new Date(2017, 12))).toEqual(MonthPicker.Month.Jan);
        expect(MonthPicker.Month.fromDate(new Date(2017, 5))).toEqual(MonthPicker.Month.Jun);
    });

    it('toIndex', () => {
        expect(MonthPicker.Month.Jan.toIndex()).toBe(1);
        expect(MonthPicker.Month.May.toIndex()).toBe(5);
        expect(MonthPicker.Month.Dec.toIndex()).toBe(12);
    });

    it('toString', () => {
        expect(MonthPicker.Month.Jan.toString()).toBe('Jan');
        expect(MonthPicker.Month.May.toString()).toBe('May');
        expect(MonthPicker.Month.Dec.toString()).toBe('Dec');
    });

    it('toShortName', () => {
        expect(MonthPicker.Month.Jan.toShortName()).toBe('Jan');
        expect(MonthPicker.Month.May.toShortName()).toBe('May');
        expect(MonthPicker.Month.Dec.toShortName()).toBe('Dec');
    });

    it('toLongName', () => {
        expect(MonthPicker.Month.Jan.toLongName()).toBe('January');
        expect(MonthPicker.Month.May.toLongName()).toBe('May');
        expect(MonthPicker.Month.Dec.toLongName()).toBe('December');
    });

    it('toDate', () => {
        expect(MonthPicker.Month.Jan.toDate(2017)).toEqual(new Date(2017, 0));
        expect(MonthPicker.Month.May.toDate(2018)).toEqual(new Date(2018, 4));
        expect(MonthPicker.Month.Dec.toDate(2019)).toEqual(new Date(2019, 11));
    });

    it('isEqual', () => {
        expect(MonthPicker.Month.Jan.isEqual(MonthPicker.Month.May)).toBe(false);
        expect(MonthPicker.Month.Jan.isEqual(MonthPicker.Month.Jan)).toBe(true);
    });

    it('isLess', () => {
        expect(MonthPicker.Month.May.isLess(MonthPicker.Month.Jan)).toBe(false);
        expect(MonthPicker.Month.May.isLess(MonthPicker.Month.May)).toBe(false);
        expect(MonthPicker.Month.May.isLess(MonthPicker.Month.Dec)).toBe(true);
    });

    it('isMore', () => {
        expect(MonthPicker.Month.May.isMore(MonthPicker.Month.Jan)).toBe(true);
        expect(MonthPicker.Month.May.isMore(MonthPicker.Month.May)).toBe(false);
        expect(MonthPicker.Month.May.isMore(MonthPicker.Month.Dec)).toBe(false);
    });
});

describe('State', () => {
    it('init', () => {
        expect(MonthPicker.init(2000)).toEqual({
            year: 2000
        });
    });

    it('setYear', () => {
        expect(MonthPicker.setYear(2017, MonthPicker.init(2000))).toEqual({
            year: 2017
        });
    });
});

describe('Stage', () => {
    const pattern = {
        Update: jest.fn(() => 'Update'),
        Select: jest.fn(() => 'Select'),
        Unselect: jest.fn(() => 'Unselect')
    };

    afterEach(() => {
        pattern.Update.mockClear();
        pattern.Select.mockClear();
        pattern.Unselect.mockClear();
    });

    describe('Update', () => {
        it('cata', () => {
            const state = MonthPicker.init(2000);

            expect(new MonthPicker.Update(state).cata(pattern)).toBe('Update');
            expect(pattern.Update).toBeCalledTimes(1);
            expect(pattern.Update).toBeCalledWith(state);
            expect(pattern.Select).not.toBeCalled();
            expect(pattern.Unselect).not.toBeCalled();
        });
    });

    describe('Select', () => {
        it('cata', () => {
            expect(new MonthPicker.Select(MonthPicker.Month.May, 2017).cata(pattern)).toBe('Select');
            expect(pattern.Update).not.toBeCalled();
            expect(pattern.Select).toBeCalledTimes(1);
            expect(pattern.Select).toBeCalledWith({
                month: MonthPicker.Month.May,
                year: 2017
            });
            expect(pattern.Unselect).not.toBeCalled();
        });
    });

    describe('Unselect', () => {
        it('cata', () => {
            expect(new MonthPicker.Unselect().cata(pattern)).toBe('Unselect');
            expect(pattern.Update).not.toBeCalled();
            expect(pattern.Select).not.toBeCalled();
            expect(pattern.Unselect).toBeCalledTimes(1);
            expect(pattern.Unselect).toBeCalledWith();
        });
    });
});

describe('Action', () => {
    const initialState = MonthPicker.init(2000);

    describe('SetYear', () => {
        it('year is Just', () => {
            expect(
                new MonthPicker.SetYear(Nothing, Nothing, 2018).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 2018
            }));
        });

        it('year is min limited', () => {
            expect(
                new MonthPicker.SetYear(Just(1990), Nothing, 1980).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 1990
            }));

            expect(
                new MonthPicker.SetYear(Just(1990), Nothing, 1991).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 1991
            }));
        });

        it('year is max limited', () => {
            expect(
                new MonthPicker.SetYear(Nothing, Just(2016), 2018).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 2016
            }));

            expect(
                new MonthPicker.SetYear(Nothing, Just(2016), 2015).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 2015
            }));
        });

        it('year is limited', () => {
            expect(
                new MonthPicker.SetYear(Just(1990), Just(2016), 1980).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 1990
            }));

            expect(
                new MonthPicker.SetYear(Just(1990), Just(2016), 2020).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 2016
            }));

            expect(
                new MonthPicker.SetYear(Just(1990), Just(2016), 2001).update(initialState)
            ).toEqual(new MonthPicker.Update({
                year: 2001
            }));
        });
    });

    it('ChangeYear', () => {
        expect(MonthPicker.ChangeYear.Prev.update(initialState)).toEqual(new MonthPicker.Update({
            year: 1999
        }));

        expect(MonthPicker.ChangeYear.Next.update(initialState)).toEqual(new MonthPicker.Update({
            year: 2001
        }));
    });

    it('SelectMonth', () => {
        expect(
            new MonthPicker.SelectMonth(MonthPicker.Month.May).update(initialState)
        ).toEqual(new MonthPicker.Select(MonthPicker.Month.May, 2000));
    });

    it('UnselectMonth', () => {
        expect(
            new MonthPicker.UnselectMonth().update(initialState)
        ).toEqual(new MonthPicker.Unselect());
    });
});

describe('View', () => {
    const dispatch = jest.fn<void, [ MonthPicker.Action ]>();

    afterEach(() => {
        dispatch.mockReset();
    });

    it('renders exactly 12 months of the current year', () => {
        const wrapper = Enzyme.shallow(
            <MonthPicker.View
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(MonthPicker.ViewMonth).length).toBe(12);
        expect(wrapper.find(FormControl).first().prop('value')).toBe('2000');
    });

    it('does not block elements without limits', () => {
        const wrapper = Enzyme.shallow(
            <MonthPicker.View
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        );

        expect(
            wrapper.find(InputGroup.Prepend).find(Button).prop('disabled')
        ).toBe(false);

        expect(
            wrapper.find(InputGroup.Append).find(Button).prop('disabled')
        ).toBe(false);

        expect(
            wrapper.find(MonthPicker.ViewMonth).filter({ disabled: true }).length
        ).toBe(0);
    });

    it('does not block elements outside limits', () => {
        const wrapper = Enzyme.shallow(
            <MonthPicker.View
                min={{ month: MonthPicker.Month.Jan, year: 1990 }}
                max={{ month: MonthPicker.Month.Dec, year: 2010 }}
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        );

        expect(
            wrapper.find(InputGroup.Prepend).find(Button).prop('disabled')
        ).toBe(false);

        expect(
            wrapper.find(InputGroup.Append).find(Button).prop('disabled')
        ).toBe(false);

        expect(
            wrapper.find(MonthPicker.ViewMonth).filter({ disabled: true }).length
        ).toBe(0);
    });

    it('blocks elements of lower limit', () => {
        const wrapper = Enzyme.shallow(
            <MonthPicker.View
                min={{ month: MonthPicker.Month.May, year: 1990 }}
                max={{ month: MonthPicker.Month.Dec, year: 2010 }}
                selected={Nothing}
                state={MonthPicker.init(1990)}
                dispatch={dispatch}
            />
        );

        expect(
            wrapper.find(InputGroup.Prepend).find(Button).prop('disabled')
        ).toBe(true);

        expect(
            wrapper.find(InputGroup.Append).find(Button).prop('disabled')
        ).toBe(false);

        expect(
            wrapper.find(MonthPicker.ViewMonth).filter({ disabled: true }).length
        ).toBe(4);
    });

    it('blocks elements of high limit', () => {
        const wrapper = Enzyme.shallow(
            <MonthPicker.View
                min={{ month: MonthPicker.Month.Jan, year: 1990 }}
                max={{ month: MonthPicker.Month.Oct, year: 2010 }}
                selected={Nothing}
                state={MonthPicker.init(2010)}
                dispatch={dispatch}
            />
        );

        expect(
            wrapper.find(InputGroup.Prepend).find(Button).prop('disabled')
        ).toBe(false);

        expect(
            wrapper.find(InputGroup.Append).find(Button).prop('disabled')
        ).toBe(true);

        expect(
            wrapper.find(MonthPicker.ViewMonth).filter({ disabled: true }).length
        ).toBe(2);
    });

    it('blocks elements inside limit', () => {
        const wrapper = Enzyme.shallow(
            <MonthPicker.View
                min={{ month: MonthPicker.Month.May, year: 2000 }}
                max={{ month: MonthPicker.Month.Oct, year: 2000 }}
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        );

        expect(
            wrapper.find(InputGroup.Prepend).find(Button).prop('disabled')
        ).toBe(true);

        expect(
            wrapper.find(InputGroup.Append).find(Button).prop('disabled')
        ).toBe(true);

        expect(
            wrapper.find(MonthPicker.ViewMonth).filter({ disabled: true }).length
        ).toBe(6);
    });

    it('does not render selected month when nothing is selected', () => {
        expect(Enzyme.shallow(
            <MonthPicker.View
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(MonthPicker.ViewMonth).filter({ selected: true }).length).toBe(0);
    });

    it('does not render selected month when selected year is different', () => {
        expect(Enzyme.shallow(
            <MonthPicker.View
                selected={Just({ month: MonthPicker.Month.May, year: 2001 })}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(MonthPicker.ViewMonth).filter({ selected: true }).length).toBe(0);
    });

    it('renders selected month at the same year', () => {
        const monthWrappers = Enzyme.shallow(
            <MonthPicker.View
                selected={Just({ month: MonthPicker.Month.May, year: 2000 })}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(MonthPicker.ViewMonth).filter({ selected: true });

        expect(monthWrappers.length).toBe(1);
        expect(monthWrappers.first().dive().text()).toBe('May');
        expect(monthWrappers.first().dive().prop('active')).toBe(true);
    });

    it('emits ChangeYear.Prev by clicking to the control', () => {
        Enzyme.shallow(
            <MonthPicker.View
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(InputGroup.Prepend).find(Button).simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(MonthPicker.ChangeYear.Prev);
    });

    it('emits ChangeYear.Next by clicking to the control', () => {
        Enzyme.shallow(
            <MonthPicker.View
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(InputGroup.Append).find(Button).simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(MonthPicker.ChangeYear.Next);
    });

    describe('emits SetYear by changing the input', () => {
        it('invalid year value', () => {
            Enzyme.shallow(
                <MonthPicker.View
                    selected={Nothing}
                    state={MonthPicker.init(2000)}
                    dispatch={dispatch}
                />
            ).find(FormControl).simulate('change', {
                currentTarget: {
                    value: '200i0'
                }
            });

            expect(dispatch).toBeCalledTimes(0);
        });

        it('valid year value', () => {
            Enzyme.shallow(
                <MonthPicker.View
                    selected={Nothing}
                    state={MonthPicker.init(2000)}
                    dispatch={dispatch}
                />
            ).find(FormControl).simulate('change', {
                currentTarget: {
                    value: '2012'
                }
            });

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(new MonthPicker.SetYear(Nothing, Nothing, 2012));
        });

        it('with limits', () => {
            const min = { month: MonthPicker.Month.Jan, year: 1990 };
            const max = { month: MonthPicker.Month.Oct, year: 2010 };

            Enzyme.shallow(
                <MonthPicker.View
                    min={min}
                    max={max}
                    selected={Nothing}
                    state={MonthPicker.init(2000)}
                    dispatch={dispatch}
                />
            ).find(FormControl).simulate('change', {
                currentTarget: {
                    value: '2012'
                }
            });

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(new MonthPicker.SetYear(Just(min.year), Just(max.year), 2012));
        });
    });

    it('emits SelectMonth by clicking to the month control', () => {
        Enzyme.shallow(
            <MonthPicker.View
                selected={Nothing}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(MonthPicker.ViewMonth).at(4).dive().find(Button).simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(new MonthPicker.SelectMonth(MonthPicker.Month.May));
    });

    it('emits SelectMonth by clicking to the month control with selected in different year', () => {
        Enzyme.shallow(
            <MonthPicker.View
                selected={Just({ month: MonthPicker.Month.May, year: 2010 })}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(MonthPicker.ViewMonth).at(4).dive().find(Button).simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(new MonthPicker.SelectMonth(MonthPicker.Month.May));
    });

    it('emits UnselectMonth by clicking to the selected month control', () => {
        Enzyme.shallow(
            <MonthPicker.View
                selected={Just({ month: MonthPicker.Month.May, year: 2000 })}
                state={MonthPicker.init(2000)}
                dispatch={dispatch}
            />
        ).find(MonthPicker.ViewMonth).at(4).dive().find(Button).simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(new MonthPicker.UnselectMonth());
    });
});
