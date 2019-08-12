import React from 'react';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import {
	BackHandler,
	Platform
} from 'react-native';
import { SafeAreaView } from 'react-navigation';
import { connect } from 'react-redux';
// import CookieManager from 'react-native-cookies';
import styles from '../Styles';
// import I18n from '../../i18n';
import StatusBar from '../../containers/StatusBar';
import { DrawerButton } from '../../containers/HeaderButton';

@connect(state => ({
	baseUrl: state.settings.Site_Url || state.server ? state.server.server : '',
	userId: state.login.user && state.login.user.id,
	authToken: state.login.user && state.login.user.token
}))
export default class AdminPanelView extends React.Component {
	static navigationOptions = ({ navigation }) => ({
		headerLeft: <DrawerButton navigation={navigation} />,
		title: 'Articles'
	});

	static propTypes = {
		baseUrl: PropTypes.string,
		userId: PropTypes.string,
		authToken: PropTypes.string,
		navigation: PropTypes.object
	}

	webView = {
		canGoBack: false,
		ref: null
	}
	// [TODO] Make a back button for iOS

	componentWillMount() {
		if (Platform.OS === 'android') {
			BackHandler.addEventListener('hardwareBackPress', this.onAndroidBackPress);
		}
	}

	componentWillUnmount() {
		if (Platform.OS === 'android') {
			BackHandler.removeEventListener('hardwareBackPress');
		}
	}

	onAndroidBackPress = () => {
		if (this.webView.canGoBack && this.webView.ref) {
			this.webView.ref.goBack();
			return true;
		}
		return false;
	}

	render() {
		const {
			navigation, authToken, userId, baseUrl
		} = this.props;
		this.articlesLink = navigation.getParam('articlesLink');
		if (!this.articlesLink) {
			return null;
		}
		// CookieManager.get(baseUrl)
		// 	.then((res) => {
		// 		console.warn('CookieManager.get =>', res);
		// 		/* [TODO]
		// 		* Based on whether baseUrl has cookies required for the articlesLink,
		// 		* in this case, rc_uid and rc_token,
		// 		* change injectedJavaScript such that
		// 		*	no-login appears if cookies are already present.
		// 		*/
		// 	});
		return (
			<SafeAreaView style={styles.container} testID='articles-view'>
				<StatusBar />
				<WebView
					source={{ uri: `${ baseUrl }/admin/info?layout=embedded` }}
					ref={(webView) => { this.webView.ref = webView; }}
					injectedJavaScript={`Meteor.loginWithToken('${ authToken }', function() { }); setTimeout(function(){ window.location.assign('${ this.articlesLink }')}, 50)`}
					onNavigationStateChange={(navState) => { this.webView.canGoBack = navState.canGoBack; }}
				/>
			</SafeAreaView>
		);
	}
}
