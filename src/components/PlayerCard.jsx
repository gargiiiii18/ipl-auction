import React, {useEffect, useState} from 'react'
const PlayerCard = ({auctionStarted, onAuctionEnd, currentPlayer}) => {

  return (
    <div>
           {
            currentPlayer ? 
            <div>
          <h1 className="player">Current Player: {currentPlayer.player_name}</h1> 
          <h2 className="playerPrice">Price: {currentPlayer.price}</h2> 
          </div>
          : 
        <h1 className="player">No Players to Bid.</h1>
      } 
      
    </div>
  )
}

export default PlayerCard
