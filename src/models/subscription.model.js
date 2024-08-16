import mongoose, {Schema} from "mongoose"
import { User } from "./user.model"

const subscriptionSchema = mongoose.Schema({
    subscriber: {
        type: Schema.Types.ObjectId(), // one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId(), // one to whome 'subscriber' is subscribing
        ref: "User"
    }
    
},{timestamps: true})