import React from 'react';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-navigation';
import { connect } from 'react-redux';
import CookieManager from 'react-native-cookies';
import styles from '../Styles';
// import I18n from '../../i18n';
import StatusBar from '../../containers/StatusBar';
import { DrawerButton } from '../../containers/HeaderButton';

@connect(state => ({
	userId: state.login.user && state.login.user.id,
	authToken: state.login.user && state.login.user.token
}))
export default class AdminPanelView extends React.Component {
	static navigationOptions = ({ navigation }) => ({
		headerLeft: <DrawerButton navigation={navigation} />,
		title: 'Articles'
	});

	static propTypes = {
		userId: PropTypes.string,
		authToken: PropTypes.string,
		navigation: PropTypes.object
	}

	render() {
		const { navigation, authToken, userId } = this.props;
		this.articlesLink = navigation.getParam('articlesLink');
		console.warn('authToken is', authToken, 'userID is', userId);
		if (!this.articlesLink) {
			return null;
		}
		// CookieManager.setFromResponse(
		// 	this.articlesLink,
		// 	`rc_uid=${ userId };rc_token=${ authToken };`
		// )
		// 	.then((res) => {
		// 		// `res` will be true or false depending on success.
		// 		alert('cookies set');
		// 	});
		return (
			<SafeAreaView style={styles.container} testID='articles-view'>
				<StatusBar />
				<WebView
					source={{ uri: this.articlesLink }}
					// injectedJavaScript={`document.cookie='rc_token=${ authToken }; rc_uid=${ userId };'`}
				/>
			</SafeAreaView>
		);
	}
}
