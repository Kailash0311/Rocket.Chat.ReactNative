import React from 'react';
import PropTypes from 'prop-types';
import {
	View, Text, TouchableHighlight, ScrollView
} from 'react-native';
import { connect } from 'react-redux';
import moment from 'moment';
import { SafeAreaView } from 'react-navigation';
import Status from '../../containers/Status';
import Avatar from '../../containers/Avatar';
import styles from './styles';
import sharedStyles from '../Styles';
import database, { safeAddListener } from '../../lib/realm';
import RocketChat from '../../lib/rocketchat';
import RoomTypeIcon from '../../containers/RoomTypeIcon';
import I18n from '../../i18n';
import { CustomHeaderButtons, Item } from '../../containers/HeaderButton';
import StatusBar from '../../containers/StatusBar';
import log from '../../utils/log';
import Button from '../../containers/Button';

const PERMISSION_EDIT_ROOM = 'edit-room';

const camelize = str => str.replace(/^(.)/, (match, chr) => chr.toUpperCase());
const getRoomTitle = room => (room.t === 'd'
	? <Text testID='room-info-view-name' style={styles.roomTitle}>{room.fname}</Text>
	: (
		<View style={styles.roomTitleRow}>
			<RoomTypeIcon type={room.prid ? 'discussion' : room.t} key='room-info-type' />
			<Text testID='room-info-view-name' style={styles.roomTitle} key='room-info-name'>{room.prid ? room.fname : room.name}</Text>
		</View>
	)
);

@connect(state => ({
	baseUrl: state.settings.Site_Url || state.server ? state.server.server : '',
	user: {
		id: state.login.user && state.login.user.id,
		token: state.login.user && state.login.user.token,
		username: state.login.user && state.login.user.username
	},
	Message_TimeFormat: state.settings.Message_TimeFormat
}))
export default class RoomInfoView extends React.Component {
	static navigationOptions = ({ navigation }) => {
		const showEdit = navigation.getParam('showEdit');
		const rid = navigation.getParam('rid');
		return {
			title: I18n.t('Room_Info'),
			headerRight: showEdit
				? (
					<CustomHeaderButtons>
						<Item iconName='edit' onPress={() => navigation.navigate('RoomInfoEditView', { rid })} testID='room-info-view-edit-button' />
					</CustomHeaderButtons>
				)
				: null
		};
	}

	static propTypes = {
		navigation: PropTypes.object,
		user: PropTypes.shape({
			id: PropTypes.string,
			token: PropTypes.string
		}),
		baseUrl: PropTypes.string,
		Message_TimeFormat: PropTypes.string
	}

	constructor(props) {
		super(props);
		this.rid = props.navigation.getParam('rid');
		const room = props.navigation.getParam('room');
		this.t = props.navigation.getParam('t');
		this.rooms = database.objects('subscriptions').filtered('rid = $0', this.rid);
		this.roles = database.objects('roles');
		this.sub = {
			unsubscribe: () => {}
		};
		this.state = {
			room: this.rooms[0] || room || {},
			roomUser: {}
		};
	}

	async componentDidMount() {
		safeAddListener(this.rooms, this.updateRoom);
		const { room } = this.state;
		const permissions = RocketChat.hasPermission([PERMISSION_EDIT_ROOM], room.rid);
		if (permissions[PERMISSION_EDIT_ROOM] && !room.prid) {
			const { navigation } = this.props;
			navigation.setParams({ showEdit: true });
		}

		if (this.t === 'd') {
			const { user } = this.props;
			const roomUserId = RocketChat.getRoomMemberId(this.rid, user.id);
			try {
				const result = await RocketChat.getUserInfo(roomUserId);
				/*
					isFollowing is true if the user is following the fetched user, false otherwise.
					isFollowing is added as a property under the user which itself is a property of the result.
				*/

				const followersOfTheUser = await RocketChat.getFollowers(result.user.username);
				console.warn('followersOfTheUser', followersOfTheUser);
				const followingOfTheUser = await RocketChat.getFollowing(result.user.username);
				console.warn('followingOfTheUser', followingOfTheUser);
				const isFollowing = await RocketChat.hasAlreadyFollowed(result.user.username);
				console.warn('isFollowing is', isFollowing);
				if (isFollowing === true) {
					result.user.isFollowing = true;
				} else {
					result.user.isFollowing = false;
				}

				if (followersOfTheUser || followingOfTheUser) {
					result.user.following = 0 || Object.keys(followingOfTheUser).length;
					result.user.followers = 0 || Object.keys(followersOfTheUser).length;
				}
				if (result.success) {
					this.setState({ roomUser: result.user });
				}
			} catch (error) {
				log('err_get_user_info', error);
			}
		}
	}

	componentWillUnmount() {
		this.rooms.removeAllListeners();
	}

	follow = async() => {
		const { roomUser } = this.state;
		roomUser.isFollowing = true;
		roomUser.followers += 1;
		this.setState({ roomUser });
		await RocketChat.followUser(roomUser.username);
	}

	unfollow = async() => {
		const { roomUser } = this.state;
		roomUser.isFollowing = false;
		roomUser.followers -= 1;
		this.setState({ roomUser });
		await RocketChat.unFollowUser(roomUser.username);
	}

	getRoleDescription = (id) => {
		const role = database.objectForPrimaryKey('roles', id);
		if (role) {
			return role.description;
		}
		return null;
	}

	isDirect = () => {
		const { room: { t } } = this.state;
		return t === 'd';
	}

	updateRoom = () => {
		if (this.rooms.length > 0) {
			this.setState({ room: JSON.parse(JSON.stringify(this.rooms[0])) });
		}
	}

	renderItem = (key, room) => (
		<View style={styles.item}>
			<Text style={styles.itemLabel}>{I18n.t(camelize(key))}</Text>
			<Text
				style={[styles.itemContent, !room[key] && styles.itemContent__empty]}
				testID={`room-info-view-${ key }`}
			>{ room[key] ? room[key] : I18n.t(`No_${ key }_provided`) }
			</Text>
		</View>
	);

	renderRole = (role) => {
		const description = this.getRoleDescription(role);
		if (description) {
			return (
				<View style={styles.roleBadge} key={role}>
					<Text style={styles.role}>{ this.getRoleDescription(role) }</Text>
				</View>
			);
		}
		return null;
	}

	renderRoles = () => {
		const { roomUser } = this.state;
		if (roomUser && roomUser.roles && roomUser.roles.length) {
			return (
				<View style={styles.item}>
					<Text style={styles.itemLabel}>{I18n.t('Roles')}</Text>
					<View style={styles.rolesContainer}>
						{roomUser.roles.map(role => this.renderRole(role))}
					</View>
				</View>
			);
		}
		return null;
	}

	renderTimezone = () => {
		const { roomUser } = this.state;
		const { Message_TimeFormat } = this.props;

		if (roomUser) {
			const { utcOffset } = roomUser;

			if (!utcOffset) {
				return null;
			}
			return (
				<View style={styles.item}>
					<Text style={styles.itemLabel}>{I18n.t('Timezone')}</Text>
					<Text style={styles.itemContent}>{moment().utcOffset(utcOffset).format(Message_TimeFormat)} (UTC { utcOffset })</Text>
				</View>
			);
		}
		return null;
	}

	renderAvatar = (room, roomUser) => {
		const { baseUrl, user } = this.props;

		return (
			<Avatar
				text={room.name}
				size={100}
				style={styles.avatar}
				type={room.t}
				baseUrl={baseUrl}
				userId={user.id}
				token={user.token}
			>
				{room.t === 'd' && roomUser._id ? <Status style={[sharedStyles.status, styles.status]} size={24} id={roomUser._id} /> : null}
			</Avatar>
		);
	}

	renderFollowButton = () => {
		const { roomUser } = this.state;
		let button = (
			<Button
				title='Follow'
				type='primary'
				style={styles.button}
				onPress={this.follow}
				testID='follow-button'
			/>
		);
		if (roomUser.isFollowing) {
			button = (
				<Button
					title='Following'
					type='primary'
					style={styles.button}
					onPress={this.unfollow}
					testID='following-button'
				/>
			);
		}

		return (
			<View style={styles.buttonContainer}>
				{button}
			</View>
		);
	}

	renderFollowersAndFollowing = () => {
		const { roomUser } = this.state;
		const { username } = roomUser;
		const { navigation } = this.props;
		const rid = navigation.getParam('rid');
		return (
			<View style={styles.followContainer}>
				<TouchableHighlight
					style={styles.buttonContainer}
					onPress={() => { navigation.navigate('RoomFollowView', { rid, username, follow: 'Followers' }); }}
				>
					<View style={styles.followersContainer}>
						<Text style={styles.followContent}>{roomUser.followers}</Text>
						<Text style={styles.followLabel}>FOLLOWERS</Text>
					</View>
				</TouchableHighlight>
				<TouchableHighlight
					style={styles.buttonContainer}
					onPress={() => { navigation.navigate('RoomFollowView', { username, follow: 'Following' }); }}
				>
					<View style={styles.followingContainer}>
						<Text style={styles.followContent}>{roomUser.following}</Text>
						<Text style={styles.followLabel}>FOLLOWING</Text>
					</View>
				</TouchableHighlight>
			</View>
		);
	}

	renderBroadcast = () => (
		<View style={styles.item}>
			<Text style={styles.itemLabel}>{I18n.t('Broadcast_Channel')}</Text>
			<Text
				style={styles.itemContent}
				testID='room-info-view-broadcast'
			>{I18n.t('Broadcast_channel_Description')}
			</Text>
		</View>
	)

	renderCustomFields = () => {
		const { roomUser } = this.state;
		if (roomUser) {
			const { customFields } = roomUser;

			if (!roomUser.customFields) {
				return null;
			}

			return (
				Object.keys(customFields).map((title) => {
					if (!customFields[title]) {
						return;
					}
					return (
						<View style={styles.item} key={title}>
							<Text style={styles.itemLabel}>{title}</Text>
							<Text style={styles.itemContent}>{customFields[title]}</Text>
						</View>
					);
				})
			);
		}
		return null;
	}

	render() {
		const { room, roomUser } = this.state;
		if (!room) {
			return <View />;
		}
		return (
			<ScrollView style={styles.scroll}>
				<StatusBar />
				<SafeAreaView style={styles.container} testID='room-info-view' forceInset={{ bottom: 'never' }}>
					<View style={styles.avatarContainer}>
						{this.renderAvatar(room, roomUser)}
						<View style={styles.roomTitleContainer}>{ getRoomTitle(room) }</View>
					</View>
					{this.isDirect() ? this.renderFollowersAndFollowing() : null}
					{this.isDirect() ? this.renderFollowButton() : null}
					{!this.isDirect() ? this.renderItem('description', room) : null}
					{!this.isDirect() ? this.renderItem('topic', room) : null}
					{!this.isDirect() ? this.renderItem('announcement', room) : null}
					{this.isDirect() ? this.renderRoles() : null}
					{this.isDirect() ? this.renderTimezone() : null}
					{this.isDirect() ? this.renderCustomFields(roomUser._id) : null}
					{room.broadcast ? this.renderBroadcast() : null}
				</SafeAreaView>
			</ScrollView>
		);
	}
}
