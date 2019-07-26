import React from 'react';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-navigation';
import { connect } from 'react-redux';
import styles from '../Styles';

// import I18n from '../../i18n';
import StatusBar from '../../containers/StatusBar';
import { DrawerButton } from '../../containers/HeaderButton';

@connect(state => ({
	authToken: state.login.user && state.login.user.token
}))
export default class AdminPanelView extends React.Component {
	static navigationOptions = ({ navigation }) => ({
		headerLeft: <DrawerButton navigation={navigation} />,
		title: 'Articles'
	});

	static propTypes = {
		navigation: PropTypes.object
	}

	render() {
		const { navigation } = this.props;
		this.articlesLink = navigation.getParam('articlesLink');
		if (!this.articlesLink) {
			return null;
		}
		return (
			<SafeAreaView style={styles.container} testID='articles-view'>
				<StatusBar />
				<WebView
					source={{ uri: this.articlesLink }}
					// injectedJavaScript={`Meteor.loginWithToken('${ authToken }', function() { })`}
				/>
			</SafeAreaView>
		);
	}
}
