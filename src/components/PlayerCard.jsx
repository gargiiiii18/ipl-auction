import React, {useEffect, useState} from 'react'
const PlayerCard = ({auctionStarted, handleAuctionEnd}) => {

  const[currentPlayer, setCurrentPlayer] = useState(null);

  async function getCurrentPlayer() {
    const url = "http://localhost:3000/currentplayer";
    try {
      const response = await fetch(url);
      const jsonData = await response.json();
      setCurrentPlayer(jsonData[0]);
      const current_player_id = jsonData[0].player_id;
      // console.log(current_player_id);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    if(!auctionStarted){
    getCurrentPlayer();
    }
  }, [auctionStarted]);

 const endAuction = () => { //whenever end auction logic is written, write it in endAuction func
  handleAuctionEnd();
  setCurrentPlayer(null);
 }


  return (
    <div>
           {
            currentPlayer ? 
          <h1 className="player">Current Player: {currentPlayer.player_name}</h1> 
          : 
        <h1 className="player">No Players to Bid.</h1>
      } 
      
    </div>
  )
}

export default PlayerCard
