import React, {useState, useEffect} from 'react';
import { useParams } from 'react-router-dom';
import AddBid from './AddBid';
const Team = (props) => {

  const [players, setPlayers] = useState([]);
  // const [isOpen, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [isClicked, setClicked] = useState(false);
  const[buttonText, setButtonText] = useState("Bid");

    //states controlling AddBid
    const [message, setMessage] = useState("");
    const [showBid, setShowBid] = useState(true);

  const {team_id} = useParams();

  const toggleDropdown = (playerId) => {
    setPlayerId((prev)=>playerId===prev?null:playerId)
    // playerId===null&&setOpen(true)
  }

  async function getPlayers(){
    const url = `http://localhost:3000/teams/${team_id}`;
    try {
      const response = await fetch(url);
      const jsonPlayers = await response.json();
      setPlayers(jsonPlayers);
      // console.log(jsonPlayers);
    } catch (error) {
      console.log(error);
      
    }
  }

  useEffect(()=>{
    getPlayers()
  }, [team_id]);

  const handleClick = () => {
    setClicked(!isClicked);
    setButtonText(buttonText=="Bid" ? "Close" : "Bid");
  }

  const handleBidResponse = (status, msg) => {
    if(status==="error"){
      setShowBid(false);
    }
    else if(status==="success"){
      setShowBid(true);
    }
    setMessage(msg);
  }

  return (
    <div className="playerContainer">
    <div className='players'>
      <h2 className='playersHeading'>Players</h2>
      <h2>Team Details for ID: {team_id}</h2>
      <ul>
      {players.length > 0 ? (
        players.map((player) => (
          <li id={player.player_id} key={player.player_id} className='teamList' onClick={()=>{
            toggleDropdown(player.player_id)
          }}>
            {player.player_name}
            {
        playerId===player.player_id&&(
          <div className="dropDown dropDown-open">
            <p>Skills: {player.skills}</p>
            <p>Price: {player.price}</p>
          </div>
        )
      }
          </li>
        ))
      ) : (
        <li className='teamList'>No players found.</li>
      )}
      </ul>
      
    </div>

    <div className='bid'>
      {/* <h2 className="bidTitle">Lets start bidding.</h2> */}
      <button className="bidBtn" onClick={handleClick}>{buttonText}</button>
    </div>
    {(isClicked && showBid) ?
    <AddBid onBidResponse = {handleBidResponse}/> :
    <h2>{message}</h2>
}
    </div>  
  )
}

export default Team
