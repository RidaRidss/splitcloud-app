import { actionTypes } from '../constants/actions';
import { globalSettings } from '../../helpers/constants';
import FileDownloadManager from '../../modules/FileDownloadManager';
let trackManager = new FileDownloadManager({extension:'mp3'});

trackManager.initCacheDir().then(
  () => trackManager.cleanupIncompleteDownloads()
);

const findTrackInAnyStoredPlaylist = (playlistArr,track) => {
  return playlistArr
  .filter(p => p.id.indexOf('default_') == 0)
  .filter( playlist => {
    return playlist.tracks.find( curr => curr.id == track.id )
  });
}
const storeLocalTrack = (track) => {
  let assetUrl = track.streamUrl, assetId = track.id;
  console.info('trackCacheMiddleware: attempt download asset ->', assetUrl);
  trackManager.hasLocalAsset(assetId)
  .then(hasAsset => {
    console.log('has local asset for url',assetUrl);
    return hasAsset ? Promise.resolve({duplicate:true}) :
      trackManager.storeAsset(assetUrl,assetId);
  })
  .then((resp) =>{
    if(resp.duplicate){
      console.info('asset already cached');
    } else {
      console.info('asset downloaded successfully',resp);
    }
  }).catch((err) =>{
    console.info('download failed with error',err);
  });

}
const deleteLocalAsset = (track,store) =>{
  console.log('findTrackInAnyPlaylist',store.getState().playlistStore,track);
  if(findTrackInAnyStoredPlaylist(store.getState().playlistStore,track).length) return false;
  console.info('trackCacheMiddleware: remove local asset:',track);
  return trackManager.deleteLocalAssetPath(track.id);
}
const deleteAllLocalAssets = () => {
  console.log('settings offlineMode turned off: delete all assets');
  trackManager.deleteAllStorage();
}
const isDefaultPlaylist = (action) => {
  return action.playlistId && action.playlistId.indexOf('default_') == 0;
}
const getPlaylistStore = (action,store) => {
  let currPlaylist = store.getState().playlist
      .find(curr => curr.side == action.side);
  let currPlaylistStore = store.getState().playlistStore
    .find(playlistData => playlistData.id == currPlaylist.currentPlaylistId);
  return currPlaylistStore;
}
const trackCacheMiddleware = store => {
  return next => {
    return action => {
      //pre action disptach middleware logic
      let prevPlaylistTracks = [];
      if(isDefaultPlaylist(action) && action.type == actionTypes.SET_PLAYLIST &&
       action.tracks.length == 0){
        console.info('get the deletable tracks assets')
        prevPlaylistTracks = getPlaylistStore(action, store).tracks.map(t => ({...t})); //deep copy
      }
      // dispatch next action middleware and reducers for action
      let result = next(action);
      //post action disptach middleware logic
      if(action.type == actionTypes.SET_GLOBAL_SETTING &&
         action.key == globalSettings.OFFLINE_MODE &&
         action.value == false
      ){
        deleteAllLocalAssets();
      }
      if(store.getState().settings.offlineMode && isDefaultPlaylist(action)){
        if(action.type == actionTypes.ADD_PLAYLIST_ITEM){
          console.log('new track added to playlist, attempt download');
          storeLocalTrack(action.track);
        }
        if([
          actionTypes.CHANGE_CURR_PLAY_INDEX,
          actionTypes.INCREMENT_CURR_PLAY_INDEX,
          actionTypes.DECREMENT_CURR_PLAY_INDEX].includes(action.type)
        ){
          let currPlaylistStore = getPlaylistStore(action, store);
          let currPlayingTrack = currPlaylistStore.tracks[currPlaylistStore.currentTrackIndex];
          console.info('new currently playing track, attempt download',currPlayingTrack);
          if(currPlayingTrack){
            storeLocalTrack(currPlayingTrack);
          }
        }
        if(action.type == actionTypes.REMOVE_PLAYLIST_ITEM){
          deleteLocalAsset(action.track,store);
        }
        if(action.type == actionTypes.SET_PLAYLIST &&
           action.tracks.length == 0){
          let allDeleted = prevPlaylistTracks.map((track) => deleteLocalAsset(track,store));
          Promise.all(allDeleted).then(() => console.info('deleted all track assets'))
        }
        return result;
      } else {
        return result;
      }
    }
  }
}

export default trackCacheMiddleware;
