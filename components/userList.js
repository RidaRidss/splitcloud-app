import React, { PropTypes, Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  Image,
  TextInput,
  ListView,
  View,
  TouchableOpacity
} from 'react-native';
import THEME from '../styles/variables';
import AppText from './appText';
class UserList extends Component {
  constructor(props){
    super(props);
  }
  render(){
    return <View>
    {this.props.userList.map((user,i) => {
      const name = user.username || user.firstName +' '+user.lastName;
      return   <TouchableOpacity
          onPress={this.props.onUserSelected.bind(this,user)} key={i} >
          <View style={styles.itemContainer}>
            <Image style={styles.profileImage} source={{url:user.avatarUrl}} resizeMode={'cover'}/>
            <AppText style={styles.userText} numberOfLines={1} ellipsizeMode={'tail'}>{name}</AppText>
          </View>
        </TouchableOpacity>;
    })}
    </View>;
  }
}
UserList.propTypes = {
  userList: PropTypes.array.isRequired,
  onUserSelected : PropTypes.func
};
const styles = StyleSheet.create({
  userText:{
    flex:1,
    color: THEME.mainHighlightColor,
    fontSize: 17,
    lineHeight: 35,
    fontWeight:'600'
  },
  profileImage:{
    borderRadius:25,
    backgroundColor:'gray',
    width:50,
    height:50,
    marginRight:20
  },
  outerContainer:{
    flex:1
  },
  itemContainer:{
    flexDirection:'row',
    marginHorizontal:20,
    marginVertical:20
  }
});

export default UserList;
