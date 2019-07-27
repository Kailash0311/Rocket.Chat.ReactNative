import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
	View, TextInput, StyleSheet
} from 'react-native';
import sharedStyles from './Styles';
import { CustomHeaderButtons, Item } from '../containers/HeaderButton';
import I18n from '../i18n';
import RocketChat from '../lib/rocketchat';
import { COLOR_TEXT_DESCRIPTION } from '../constants/colors';
import { LISTENER } from '../containers/Toast';
import EventEmitter from '../utils/events';

const styles = StyleSheet.create({
	// container: {
	// 	backgroundColor: '#f7f8fa',
	// 	flex: 1
	// },
	// list: {
	// 	width: '100%',
	// 	backgroundColor: COLOR_WHITE
	// },
	// separator: {
	// 	marginLeft: 60
	// },
	// formSeparator: {
	// 	marginLeft: 15
	// },
	input: {
		height: 54,
		paddingHorizontal: 18,
		fontSize: 17,
		...sharedStyles.textRegular,
		...sharedStyles.textColorNormal,
		backgroundColor: 'white'
	}
	// swithContainer: {
	// 	height: 54,
	// 	backgroundColor: COLOR_WHITE,
	// 	alignItems: 'center',
	// 	justifyContent: 'space-between',
	// 	flexDirection: 'row',
	// 	paddingHorizontal: 18
	// },
	// label: {
	// 	fontSize: 17,
	// 	...sharedStyles.textMedium,
	// 	...sharedStyles.textColorNormal
	// },
	// invitedHeader: {
	// 	marginTop: 18,
	// 	marginHorizontal: 15,
	// 	flexDirection: 'row',
	// 	justifyContent: 'space-between',
	// 	alignItems: 'center'
	// },
	// invitedTitle: {
	// 	fontSize: 18,
	// 	...sharedStyles.textSemibold,
	// 	...sharedStyles.textColorNormal,
	// 	lineHeight: 41
	// },
	// invitedCount: {
	// 	fontSize: 14,
	// 	...sharedStyles.textRegular,
	// 	...sharedStyles.textColorDescription
	// }
});

@connect(state => ({
	baseUrl: state.settings.Site_Url || state.server ? state.server.server : '',
	error: state.createChannel.error,
	failure: state.createChannel.failure,
	isFetching: state.createChannel.isFetching,
	result: state.createChannel.result,
	users: state.selectedUsers.users,
	user: {
		id: state.login.user && state.login.user.id,
		token: state.login.user && state.login.user.token
	}
}))
export default class CreateSA extends React.Component {
	static navigationOptions = ({ navigation }) => {
		const submit = navigation.getParam('submit', () => {});
		const showSubmit = navigation.getParam('showSubmit');
		return {
			title: I18n.t('Create_Service_Account'),
			headerRight: (
				showSubmit
					? (
						<CustomHeaderButtons>
							<Item title={I18n.t('Create')} onPress={submit} testID='create-sa-submit' />
						</CustomHeaderButtons>
					)
					: null
			)
		};
	}

	static propTypes = {
		navigation: PropTypes.object,
		// baseUrl: PropTypes.string,
		// create: PropTypes.func.isRequired,
		user: PropTypes.shape({
			id: PropTypes.string,
			token: PropTypes.string
		})
	};

	constructor(props) {
		super(props);
		this.onChangeTextForName = this.onChangeTextForName.bind(this);
		this.onChangeTextForPassword = this.onChangeTextForPassword.bind(this);
		this.onChangeTextForUsername = this.onChangeTextForUsername.bind(this);
		this.onChangeTextForDesc = this.onChangeTextForDesc.bind(this);
		this.onChangeTextForConfirmpwd = this.onChangeTextForConfirmpwd.bind(this);
	}

	state = {
		name: '',
		password: '',
		confirmpwd: '',
		username: '',
		description: ''
	};

	componentDidMount() {
		const { navigation } = this.props;
		navigation.setParams({ submit: this.submit });
	}

	shouldComponentUpdate(nextProps, nextState) {
		const {
			name, password, username, description, confirmpwd
		} = this.state;

		if (nextState.name !== name) {
			return true;
		}
		if (nextState.password !== password) {
			return true;
		}
		if (nextState.confirmpwd !== confirmpwd) {
			return true;
		}
		if (nextState.username !== username) {
			return true;
		}
		if (nextState.description !== description) {
			return true;
		}
		return false;
	}

	onChangeTextForName = (name) => {
		const { navigation } = this.props;
		const { username, password, confirmpwd } = this.state;
		navigation.setParams({ showSubmit: (name.trim().length > 0 && password.trim().length > 0 && confirmpwd.trim().length > 0 && username.trim().length > 0) });
		this.setState({ name });
	}

	onChangeTextForPassword = (password) => {
		const { navigation } = this.props;
		const { username, name, confirmpwd } = this.state;
		navigation.setParams({ showSubmit: (name.trim().length > 0 && password.trim().length > 0 /*&& confirmpwd.trim().length > 0*/ && username.trim().length > 0) });
		this.setState({ password });
	}

	onChangeTextForConfirmpwd = (confirmpwd) => {
		const { navigation } = this.props;
		const { username, name, password } = this.state;
		navigation.setParams({ showSubmit: (name.trim().length > 0 && confirmpwd.trim().length > 0 && password.trim().length > 0 && username.trim().length > 0) });
		this.setState({ confirmpwd });
	}

	onChangeTextForUsername = (username) => {
		const { navigation } = this.props;
		const { name, password, confirmpwd } = this.state;
		navigation.setParams({ showSubmit: (name.trim().length > 0 && password.trim().length > 0 && confirmpwd.trim().length > 0 && username.trim().length > 0) });
		this.setState({ username });
	}

	onChangeTextForDesc= (description) => {
		this.setState({ description });
	}

	checkIfEqualPwds = () => {
		const { password, confirmpwd } = this.state;
		console.warn(password, confirmpwd);
		if (password !== confirmpwd) {
			EventEmitter.emit(LISTENER, { message: 'The two passwords are not equal' });
			return false;
		}
		return true;
	}

	submit = async() => {
		const data = this.state;
		const { navigation } = this.props;
		if (!this.checkIfEqualPwds()) {
			EventEmitter.emit(LISTENER, { message: 'The two passwords are not equal' });
		} else {
			delete data.confirmpwd;
			await RocketChat.createServiceAccount(data);
			EventEmitter.emit(LISTENER, { message: `Service Account - ${ data.name } Created` });
			navigation.navigate('RoomsListView');
		}
	}

	render() {
		const {
			name, password, username, description, confirmpwd
		} = this.state;
		return (
			<View>
				{<TextInput
					label='Name'
					style={styles.input}
					value={name}
					onChangeText={this.onChangeTextForName}
					returnKeyType='done'
					placeholder='Name'
					placeholderTextColor={COLOR_TEXT_DESCRIPTION}
					autoCorrect={false}
					autoCapitalize='none'
					underlineColorAndroid='transparent'
				/>}
				{<TextInput
					label='Set Username Of the Service Account'
					style={styles.input}
					value={username}
					onChangeText={this.onChangeTextForUsername}
					returnKeyType='done'
					placeholder='Username'
					placeholderTextColor={COLOR_TEXT_DESCRIPTION}
					autoCorrect={false}
					autoCapitalize='none'
					underlineColorAndroid='transparent'
				/>}
				{<TextInput
					label='Password'
					style={styles.input}
					value={password}
					onChangeText={this.onChangeTextForPassword}
					returnKeyType='done'
					placeholder='Password'
					placeholderTextColor={COLOR_TEXT_DESCRIPTION}
					autoCorrect={false}
					autoCapitalize='none'
					secureTextEntry
					underlineColorAndroid='transparent'
				/>}
				{<TextInput
					label='Confirm Password'
					style={styles.input}
					value={confirmpwd}
					onChangeText={this.onChangeTextForConfirmpwd}
					onBlur={this.checkIfEqualPwds}
					returnKeyType='done'
					placeholder='Confirm Password'
					placeholderTextColor={COLOR_TEXT_DESCRIPTION}
					autoCorrect={false}
					autoCapitalize='none'
					secureTextEntry
					underlineColorAndroid='transparent'
				/>}
				{<TextInput
					label='Description'
					style={styles.input}
					value={description}
					onChangeText={this.onChangeTextForDesc}
					returnKeyType='done'
					placeholder='Description'
					placeholderTextColor={COLOR_TEXT_DESCRIPTION}
					autoCorrect={false}
					autoCapitalize='none'
					underlineColorAndroid='transparent'
				/>}
			</View>
		);
	}
}
