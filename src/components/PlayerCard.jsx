import React, {useEffect, useState} from 'react'
const PlayerCard = ({auctionStarted, onAuctionEnd, currentPlayer}) => {

  return (
    <div>
           {
            currentPlayer ? 
            <div className='playerInfo'>
          <h1 className="player">Current Player</h1> 
          <h1 className="playerName">{currentPlayer.player_name}</h1> 
          <div className="playerDetails">
          <h2 className="playerPrice">Price: {currentPlayer.price}cr</h2> 
          <h2 className="playerPrice">Skills: {currentPlayer.skills}</h2> 
          </div>
          </div>
          : 
        <h1 className="player">No Players to Bid.</h1>
      } 
      
    </div>
  )
}

export default PlayerCard
