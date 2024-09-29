import React, {useEffect, useState} from 'react'
const PlayerCard = () => {

  const[currentPlayer, setCurrentPlayer] = useState([]);

  async function getCurrentPlayer() {
    const url = "http://localhost:3000/currentplayer";
    try {
      const response = await fetch(url);
      const jsonData = await response.json();
      setCurrentPlayer(jsonData)
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    getCurrentPlayer()
  }, []);

  return (
    <div>
           {
            currentPlayer.length != 0 ? 
        currentPlayer.map((player, index)=>( 
          <h1 className="player">Current Player: {player.player_name}</h1>
        )) :
        <h1 className="player">No Players to Bid.</h1>
      } 
      
    </div>
  )
}

export default PlayerCard
