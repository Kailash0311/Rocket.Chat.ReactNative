import React from 'react';
import PropTypes from 'prop-types';
import { FlatList, View, ActivityIndicator } from 'react-native';
import ActionSheet from 'react-native-action-sheet';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-navigation';
import equal from 'deep-equal';
import styles from './styles';
import UserItem from './UserItem';
import scrollPersistTaps from '../../utils/scrollPersistTaps';
import RocketChat from '../../lib/rocketchat';
import database, { safeAddListener } from '../../lib/realm';
import { LISTENER } from '../../containers/Toast';
import EventEmitter from '../../utils/events';
import log from '../../utils/log';
// import { vibrate } from '../../utils/vibration';
import I18n from '../../i18n';
import SearchBox from '../../containers/SearchBox';
import protectedFunction from '../../lib/methods/helpers/protectedFunction';
import StatusBar from '../../containers/StatusBar';

const PAGE_SIZE = 25;

@connect(state => ({
	baseUrl: state.settings.Site_Url || state.server ? state.server.server : '',
	user: {
		id: state.login.user && state.login.user.id,
		token: state.login.user && state.login.user.token,
		username: state.login.user && state.login.user.username
	}
}))

/** @extends React.Component */
export default class RoomFollowView extends React.Component {
	static navigationOptions = ({ navigation }) => {
		const title = navigation.getParam('follow'); // Followers or Following
		return {
			title
		};
	}

	static propTypes = {
		navigation: PropTypes.object,
		rid: PropTypes.string,
		followers: PropTypes.array,
		baseUrl: PropTypes.string,
		room: PropTypes.object,
		user: PropTypes.shape({
			id: PropTypes.string,
			token: PropTypes.string,
			username: PropTypes.string
		})
	}

	constructor(props) {
		super('MentionedMessagesView', props);

		this.CANCEL_INDEX = 0;
		this.MUTE_INDEX = 1;
		this.actionSheetOptions = [''];
		const { rid, username } = props.navigation.state.params;
		this.rooms = database.objects('subscriptions').filtered('rid = $0', rid);
		this.permissions = RocketChat.hasPermission(['mute-user'], rid);
		this.state = {
			isLoading: false,
			filtering: false,
			rid,
			username,
			followers: [],
			followersFiltered: [],
			followingOfTheUser: [],
			userLongPressed: {},
			room: this.rooms[0] || {},
			options: [],
			end: false
		};
	}

	componentDidMount() {
		this.fetchFollowers();
		safeAddListener(this.rooms, this.updateRoom);
	}

	shouldComponentUpdate(nextProps, nextState) {
		const {
			filtering, followers, followersFiltered, userLongPressed, room, options, isLoading
		} = this.state;
		if (nextState.filtering !== filtering) {
			return true;
		}
		if (!equal(nextState.followers, followers)) {
			return true;
		}
		if (!equal(nextState.options, options)) {
			return true;
		}
		if (!equal(nextState.followersFiltered, followersFiltered)) {
			return true;
		}
		if (!equal(nextState.userLongPressed, userLongPressed)) {
			return true;
		}
		if (!equal(nextState.room.muted, room.muted)) {
			return true;
		}
		if (isLoading !== nextState.isLoading) {
			return true;
		}
		return false;
	}

	componentWillUnmount() {
		this.rooms.removeAllListeners();
	}

	onSearchChangeText = protectedFunction((text) => {
		const { followers } = this.state;
		let followersFiltered = [];

		if (followers && followers.length > 0 && text) {
			followersFiltered = followers.filter(m => m.username.toLowerCase().match(text.toLowerCase()));
		}
		this.setState({ filtering: !!text, followersFiltered });
	})

	onPressUser = async(item) => {
		try {
			const subscriptions = database.objects('subscriptions').filtered('name = $0', item.username);
			if (subscriptions.length) {
				this.goRoom({ rid: subscriptions[0].rid, name: item.username });
			} else {
				const result = await RocketChat.createDirectMessage(item.username);
				if (result.success) {
					this.goRoom({ rid: result.room._id, name: item.username });
				}
			}
		} catch (e) {
			log('onPressUser', e);
		}
	}

	onLongPressUser = (user) => {
		if (!this.permissions['mute-user']) {
			return;
		}
		const { room } = this.state;
		const { muted } = room;

		this.actionSheetOptions = [I18n.t('Cancel')];
		const userIsMuted = !!muted.find(m => m.value === user.username);
		user.muted = userIsMuted;
		if (userIsMuted) {
			this.actionSheetOptions.push(I18n.t('Unmute'));
		} else {
			this.actionSheetOptions.push(I18n.t('Mute'));
		}
		this.setState({ userLongPressed: user });
		// vibrate();
		this.showActionSheet();
	}

	showActionSheet = () => {
		ActionSheet.showActionSheetWithOptions({
			options: this.actionSheetOptions,
			cancelButtonIndex: this.CANCEL_INDEX,
			title: I18n.t('Actions')
		}, (actionIndex) => {
			this.handleActionPress(actionIndex);
		});
	}

	fetchFollowers = async() => {
		const {
			followers, isLoading, end, username
		} = this.state;
		const { user, navigation } = this.props;
		if (isLoading || end) {
			return;
		}

		this.setState({ isLoading: true });
		try {
			let followersResult = {};
			let followersArray = [];
			if (navigation.getParam('follow') === 'Followers') {
				followersResult = await RocketChat.getFollowers(username);
				followersArray = followersResult.map(item => item.follower);
			} else {
				followersResult = await RocketChat.getFollowing(username);
				followersArray = followersResult.map(item => item.following);
			}
			/*
			 Both followers and following are named as followers.
			*/
			let newFollowers = [];
			const resultPromises = [];
			let results = [];
			// const followersArray = followers
			// const followersArray = Object.keys(followersResult);
			console.warn('followersArray is', followersArray);
			for (let i = 0; i < followersArray.length; i += 1) {
				resultPromises.push(RocketChat.getUserInfo(followersArray[i]));
			}
			await Promise.all(resultPromises).then((resultsTemp) => {
				results =	resultsTemp.map(el => el.user);
			});
			newFollowers = results;

			const followingOfTheUser = await RocketChat.getFollowing(user.username);
			this.setState({
				followers: followers.concat(newFollowers || []),
				followingOfTheUser,
				isLoading: false,
				end: newFollowers.length < PAGE_SIZE
			});
		} catch (error) {
			console.log('TCL: fetchFollowers -> error', error);
			this.setState({ isLoading: false });
		}
	}

	updateRoom = () => {
		if (this.rooms.length > 0) {
			const [room] = this.rooms;
			this.setState({ room });
		}
	}

	goRoom = async({ rid, name }) => {
		const { navigation } = this.props;
		await navigation.popToTop();
		navigation.navigate('RoomView', { rid, name, t: 'd' });
	}

	handleMute = async() => {
		const { rid, userLongPressed } = this.state;
		try {
			await RocketChat.toggleMuteUserInRoom(rid, userLongPressed.username, !userLongPressed.muted);
			EventEmitter.emit(LISTENER, { message: I18n.t('User_has_been_key', { key: userLongPressed.muted ? I18n.t('unmuted') : I18n.t('muted') }) });
		} catch (e) {
			log('handleMute', e);
		}
	}

	handleActionPress = (actionIndex) => {
		switch (actionIndex) {
			case this.MUTE_INDEX:
				this.handleMute();
				break;
			default:
				break;
		}
	}

	renderSearchBar = () => (
		<SearchBox onChangeText={text => this.onSearchChangeText(text)} testID='room-followers-view-search' />
	)

	renderSeparator = () => <View style={styles.separator} />;

	renderItem = ({ item }) => {
		const { baseUrl, user } = this.props;
		const { followingOfTheUser } = this.state;
		let follow = false;
		if (followingOfTheUser[item._id] === '') {
			follow = true;
		} else {
			follow = false;
		}
		console.warn('followingof the user', followingOfTheUser);
		followingOfTheUser.map((followItem) => {
			if (followItem.following === item._id) {
				follow = true;
			}
			return followItem;
		});
		return (
			<UserItem
				name={item.name}
				username={item.username}
				onPress={() => this.onPressUser(item)}
				onLongPress={() => this.onLongPressUser(item)}
				baseUrl={baseUrl}
				testID={`room-followers-view-item-${ item.username }`}
				user={user}
				following={follow}
			/>
		);
	}

	render() {
		const {
			filtering, followers, followersFiltered, isLoading
		} = this.state;

		return (
			<SafeAreaView style={styles.list} testID='room-followers-view' forceInset={{ bottom: 'never' }}>
				<StatusBar />
				<FlatList
					data={filtering ? followersFiltered : followers}
					renderItem={this.renderItem}
					style={styles.list}
					keyExtractor={item => item._id}
					ItemSeparatorComponent={this.renderSeparator}
					ListHeaderComponent={this.renderSearchBar}
					ListFooterComponent={() => {
						if (isLoading) {
							return <ActivityIndicator style={styles.loading} />;
						}
						return null;
					}}
					onEndReachedThreshold={0.1}
					onEndReached={this.fetchFollowers}
					maxToRenderPerBatch={5}
					windowSize={10}
					{...scrollPersistTaps}
				/>
			</SafeAreaView>
		);
	}
}
