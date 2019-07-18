import * as types from './actionsTypes';

export function changeServiceAccount(credentials) {
	return {
		type: types.SWITCH_ACCOUNT.REQUEST,
		credentials
	};
}
