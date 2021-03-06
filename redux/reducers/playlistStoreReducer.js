import initialState from './initialState';
import { actionTypes } from '../constants/actions';
import { REHYDRATE } from 'redux-persist/constants';

function findTrackById(searchId){
  return track => track.id == searchId;
}
function applyFilterVisibility(value,playlistId){
  return (track) => {
    if(playlistId.indexOf('default') != 0) return {...track,isVisible:true};
    if(!value || value == '') return {...track,isVisible:true};
    let matchString = track.label.toLowerCase() + '' + track.username.toLowerCase();
    let isVisible = matchString.indexOf(value.toLowerCase()) != -1;
    return {...track,isVisible};
  }
}
function getNextVisibleIndex(index,queue,originIndex){
  let next = index,foundIndex = false;
  while(queue[++next]){
    if(queue[next].isVisible){
      foundIndex = next;
      break;
    }
  }
  if(foundIndex == false){
    if(index == 0 && originIndex != undefined){
      return originIndex;
    } else {
      return queue[0].isVisible ? 0 : getNextVisibleIndex(0,queue,index);
    }
  }
  return foundIndex;
}
function getPrevVisibleIndex(index,queue){
  if(index == 0) return 0;
  let prev = index,foundIndex = index;
  while(queue[--prev]){
    if(queue[prev].isVisible){
      foundIndex = prev;
      break;
    }
  }
  return foundIndex;
}
function currentPlaylistReducer(state , currAction){
  let toIndex;
  switch(currAction.type){
  case actionTypes.PLAY_PLAYLIST_ITEM:
    return {
      ...state,
      currentPlaylistId: currAction.playlistId
    }
  case actionTypes.FILTER_PLAYLIST:
    return {
      ...state,
      filterTracks: currAction.value,
      //TODO: change visibility flag
      tracks: state.tracks.map(applyFilterVisibility(currAction.value,state.id))
    };
  case actionTypes.ADD_PLAYLIST_ITEM:
    if((state.tracks).some(findTrackById(currAction.track.id))){
      return state;
    }
    let currTrack = applyFilterVisibility(state.filterTracks,state.id)(currAction.track);
    return {
      ...state,
      tracks : [currTrack, ...state.tracks],
      currentTrackIndex : state.tracks.length ? state.currentTrackIndex + 1 : 0,
      autoplay : true
    };
  case actionTypes.SET_PLAYLIST:
    return {
      ...state,
      tracks : [...currAction.tracks].map(applyFilterVisibility(state.filterTracks,state.id)),
      currentTrackIndex:0,
      autoplay : true
    };
  case actionTypes.REMOVE_PLAYLIST_ITEM:
    let toRemoveIdx = state.tracks.findIndex(findTrackById(currAction.track.id));
    let toTrackIdx =  state.currentTrackIndex;
    if( toRemoveIdx < state.currentTrackIndex && state.currentTrackIndex > 0){
      toTrackIdx = state.currentTrackIndex - 1;
    }
    return {
      ...state,
      tracks : toRemoveIdx > -1 ?
        state.tracks.filter( (t,idx) => idx !== toRemoveIdx) : state.tracks,
      currentTrackIndex: toTrackIdx,
      autoplay : false
    };
  case actionTypes.INCREMENT_CURR_PLAY_INDEX:
    if(state.tracks.length == 0) return state;
    let nextIndex = getNextVisibleIndex(state.currentTrackIndex, state.tracks);
    return {
      ...state,
      currentTrackIndex:nextIndex,
      autoplay : true
    };
  case actionTypes.DECREMENT_CURR_PLAY_INDEX:
    if(state.tracks.length == 0) return state;
    let prevIndex = getPrevVisibleIndex(state.currentTrackIndex, state.tracks);
    return {
      ...state,
      currentTrackIndex: prevIndex,
      autoplay : true
    };
  case actionTypes.CHANGE_CURR_PLAY_INDEX:
    toIndex = state.tracks.findIndex(findTrackById(currAction.track.id));
    if( toIndex == -1 ) toIndex = state.currentTrackIndex;
    return {
      ...state,
      currentTrackIndex:toIndex,
      autoplay : true
    };
  default:
    return state;
  }
}
export function playlistStoreReducer(state = initialState.playlistStore,action){
  switch(action.type){
  case actionTypes.ADD_PLAYLIST_ITEM:
  case actionTypes.REMOVE_PLAYLIST_ITEM:
  case actionTypes.PLAY_PLAYLIST_ITEM:
  case actionTypes.INCREMENT_CURR_PLAY_INDEX:
  case actionTypes.DECREMENT_CURR_PLAY_INDEX:
  case actionTypes.CHANGE_CURR_PLAY_INDEX:
  case actionTypes.SET_PLAYLIST:
  case actionTypes.FILTER_PLAYLIST:
    const playlistId = action.playlistId || 'playbackQueue_' + action.side;
    return state.map((playlist)=>{
      if(playlist.id == playlistId){
        return {
          ...currentPlaylistReducer(playlist,action)
        };
      }
      return {
        ...playlist,
        autoplay:true
      };
    });
    /*
     in case of reydration use the rehydrate flag to indicate that it is not
     the result of a user interaction thus no automatic playback should be triggered
     */
  case REHYDRATE:
    return (action.payload.playlistStore || state).map((playlist) => {
      return {
        ...playlist,
        autoplay:false
      }
    });
  default:
    return state;
  }
}
