import React, {Fragment, useEffect, useState} from 'react';
import { BrowserRouter } from 'react-router-dom';
import TeamCard from './TeamCard';
import AddTeam from './AddTeam';
import PlayerCard from './PlayerCard';
import WinnerCalculate from './WinnerCalculate';

const Homepage = () => {

  const[isClicked, setClicked] = useState(false);
  const[auctionStarted, setAuctionStarted] = useState(true);
  const[buttonText, setButtonText] = useState("Add Team");
  const[currentPlayer, setCurrentPlayer] = useState(null);
  const[currentPlayerId, setCurrentPlayerId] = useState(null);

  const onAuctionEnd = async () => {
    
    try {
      const url = "http://localhost:3000/endauction"
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if(!response.ok){
        throw new Error("Failed to end Auction");
      }

      const result = response.json();
      // console.log(result.message);
      setAuctionStarted(false);
      getCurrentPlayer();
    } catch (error) {
      console.log(error); 
    }
  }

  useEffect(()=>{
    const checkAuctionStatus = async () =>{
    try {
      const url = "http://localhost:3000/auctionstatus"
      const response = await fetch(url);
      const data = await response.json();
      setAuctionStarted(data.auction_started);
      console.log(data.auction_started);
    } catch (error) {
      console.log(error);
    }
    };
    checkAuctionStatus();
  }, [])

  async function getCurrentPlayer() {
    const url = "http://localhost:3000/currentplayer";
    try {
      const response = await fetch(url);
      const jsonData = await response.json();

      if(!response.ok||jsonData.length==0){
        throw new Error("Failed to fetch player.");
      }

      setCurrentPlayer(jsonData[0]);
      setCurrentPlayerId(jsonData[0].player_id);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    if(!auctionStarted){
    getCurrentPlayer();
    }
  }, [auctionStarted, currentPlayer]);

  const handleClick = () => {
    setClicked(!isClicked);
   setButtonText(isClicked?'Add Team':'Close')
  }

  return (
    <Fragment>
      <div className="wallpaper">
      <div className='heading'>
     <h1>IPL Auction</h1>
     </div>
     <div className="teamContainer">
      <div className="cards">
    <TeamCard currentPlayer={currentPlayer}/>
    <div className="playerAndResult">
    {!isClicked &&
    <PlayerCard currentPlayer={currentPlayer} auctionStarted={auctionStarted} />
  }
  {!isClicked && !auctionStarted &&
<WinnerCalculate/>
}
</div>
  </div>
    <div className="buttons">
    <button onClick={handleClick} className='addTeamBtn'>{buttonText}</button>

  {!isClicked && !auctionStarted &&
    <button className='endAuctionBtn' onClick={onAuctionEnd}>Get Player</button>
  }
  </div>
  
      {isClicked &&
    <AddTeam/>
}
    </div>
    </div>
    </Fragment>
  )
}

export default Homepage
