import React, {useState} from 'react'
const AddBid = () => {

const [bid, setBid]  = useState(null); 

  return (
    <div>
       {/* <h2>Current Player: {currentPlayer}</h2> */}
       <form className='bidForm' action="">
        <label htmlFor="bid">Bid</label>
        <input type="text" value={bid}/>
        <button className='submitBid'>Done</button>
       </form>
    </div>
  )
}

export default AddBid
