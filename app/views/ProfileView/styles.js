import { StyleSheet, Platform } from 'react-native';
import sharedStyles from '../Styles';

export default StyleSheet.create({
	avatarContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10
	},
	avatarButtons: {
		flexWrap: 'wrap',
		flexDirection: 'row',
		justifyContent: 'flex-start'
	},
	avatarButton: {
		backgroundColor: '#e1e5e8',
		width: 50,
		height: 50,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 15,
		marginBottom: 15,
		borderRadius: 2
	},
	dialogInput: Platform.select({
		ios: {},
		android: {
			borderRadius: 4,
			borderColor: 'rgba(0,0,0,.15)',
			borderWidth: 2,
			paddingHorizontal: 10
		}
	}),
	followContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	followLabel: {
		padding: 10,
		fontSize: 12,
		...sharedStyles.textColorNormal,
		...sharedStyles.textMedium
	},
	followingContainer: {
		borderColor: '#f5f5f5',
		borderWidth: 1,
		borderRadius: 2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 10
	},
	followersContainer: {
		marginRight: 10,
		borderColor: '#f5f5f5',
		borderWidth: 1,
		borderRadius: 2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	followContent: {
		padding: 10,
		fontSize: 20,
		// marginRight: 40,
		...sharedStyles.textColorNormal,
		...sharedStyles.textMedium
	}
});
