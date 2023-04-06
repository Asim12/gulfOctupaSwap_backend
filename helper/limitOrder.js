const { Order_bsc } = require("../models/Order_bsc")
const { Order_eth } = require("../models/Order_eth")
const {Sell_order_bsc} = require("../models/Sell_order_bsc")
const {Sell_order_eth} = require("../models/Sell_order_eth")
const {Cancel_order_bsc} = require("../models/Cancel_order_bsc")
const {Cancel_order_eth} = require("../models/Cancel_order_eth")
// const { Price_bsc } = require("../models/Price_bsc")
// const { Price_eth } = require("../models/Price_eth")
// require('dotenv').config()
// const {} = process.env;
module.exports = {
    createOrder: (userId, from_contract_address, to_contract_address, quantity, sellPrice, sellDateBefore, orderType, providerType,  from_symbol, to_symbol) => {
        return new Promise(async (resolve) => {
            try {
                let collection = (providerType == "BNB") ? Order_bsc : Order_eth
                let orderObject = {
                    userId: userId,
                    orderType: orderType,
                    from_contract_address: from_contract_address,
                    to_contract_address: to_contract_address,
                    from_symbol : from_symbol, 
                    to_symbol : to_symbol,
                    quantity: quantity,
                    sellPrice: sellPrice,
                    sellDateBefore: sellDateBefore,
                    status: "new",
                    providerType: providerType,
                    created_date: new Date(),
                    updated_date: new Date(),
                    cron_update_time: new Date(),
                }
                await collection.create(orderObject)
                resolve(true)
            } catch (error) {
                console.log(error)
                resolve(false)
            }
        })
    },

    getOrders: (userId, status, providerType) => {
        return new Promise(async (resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let orders = await collection.find({ userId: userId, providerType: providerType })
            resolve(orders)
        })
    },

    cancelOrder: (orderId, userId, providerType) => {
        return new Promise(async (resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let response = await collection.updateOne({ _id: orderId, userId: userId, status: "new", providerType: providerType }, { $set: { status: "cancel", updated_date: new Date() } })
            console.log("modified count =====>>>>>", response.modifiedCount)
            let status = (response.modifiedCount > 0) ? true : false;
            resolve(status)
        })
    },

    deleteOrder: (orderId, userId, providerType) => {
        return new Promise(async (resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let response = await collection.deleteOne({ _id: orderId, userId: userId, status: "new", providerType: providerType })
            console.log(response)
            let status = (response.deletedCount > 0) ? true : false
            resolve(status)
        })
    },

    pausePlayOrderStatus: (orderId, userId, status, providerType) => {
        return new Promise(async (resolve) => {
            let statusUpdate = (status == "new") ? "pause" : "new";
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let response = await collection.updateOne({ _id: orderId, userId: userId, providerType: providerType }, { $set: { status: statusUpdate, updated_date: new Date() } })
            let returnRes = (response.modifiedCount > 0) ? true : false
            resolve(returnRes)
        })
    },

    updateOrder: (orderId, userId, newPrice, newQuantity, newDate, providerType) => {
        return new Promise(async (resolve) => {
            let collection = (providerType == "BSC") ? Order_bsc : Order_eth
            let response = await collection.updateOne({ _id: orderId, userId: userId, status: "new", providerType: providerType }, { $set: { sellPrice: newPrice, quantity: newQuantity, sellDateBefore: newDate, updated_date: new Date() } })
            let status = (response.modifiedCount > 0) ? true : false
            resolve(status)
        })
    },

    getNewOrder: (providerType) => {
        return new Promise(async (resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let response = await collection.updateMany({ providerType: providerType, status: "new", sellDateBefore: { $lt: new Date() } }, { $set: { status: "cancel", updated_date: new Date() } })
            resolve(response.modifiedCount);
        })
    },

    getLimitOrders_bsc: (orderType) => {
        return new Promise(async (resolve) => {
            let currentTime = new Date()
            console.log("current Datetime ===>>>", currentTime) 
            var endTime = new Date(currentTime.setMinutes(currentTime.getMinutes() - 2));
            console.log("end time ====>>>", endTime)
            let getOrderQuery = [
                {
                $match: {
                        providerType: "BNB",
                        orderType: orderType,
                        status: "new",
                        sellDateBefore: { $gt: new Date() },
                        $or: [
                            { cron_update_time: "" },
                            { cron_update_time: { $exists: false } },
                            { cron_update_time: { $lte: endTime } }
                        ]
                    }
                },
                {
                    '$lookup': {
                        'from': "price_bscs",
                        'let': {
                            'symbol': '$to_symbol',
                            "sellPrice": "$sellPrice"
                        },
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        "$and": [
                                            {
                                                '$eq': [
                                                    '$symbol',
                                                    '$$symbol'
                                                ]
                                            },
                                            {
                                                '$lte': [
                                                    '$price',
                                                    '$$sellPrice'
                                                ]
                                            }
                                        ]
                                    },
                                },
                            }
                        ],
                        'as': 'prices'
                    }
                },
                {
                    $limit: 50
                },
                {
                    $sort: { created_date: -1 }
                }
            ]
            let orders = await Order_bsc.aggregate(getOrderQuery)
            resolve(orders)
        })
    },

    makeOrderSold: (orderId, providerType, sold_price, transactionHash) => {
        return new Promise(async(resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            collection.updateOne({_id : orderId}, {$set : {status : "complete", sold_price : sold_price, sell_date : new Date(), transaction_hash : transactionHash}})
            resolve(true)
        })
    },

    getLimitOrders_eth : (orderType) => {
        return new Promise(async(resolve) => {
            let currentTime = new Date()
            console.log("current Datetime ===>>>", currentTime) 
            var endTime = new Date(currentTime.setMinutes(currentTime.getMinutes() - 2));
            console.log("end time ====>>>", endTime)
            let getOrderQuery = [
                {
                $match: {
                        providerType: "ETH",
                        orderType: orderType,
                        status: "new",
                        sellDateBefore: { $gt: new Date() },
                        $or: [
                            { cron_update_time: "" },
                            { cron_update_time: { $exists: false } },
                            { cron_update_time: { $lte: endTime } }
                        ]
                    }
                },
                {
                    '$lookup': {
                        'from': "price_eths",
                        'let': {
                            'symbol': '$to_symbol',
                            "sellPrice": "$sellPrice"
                        },
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        "$and": [
                                            {
                                                '$eq': [
                                                    '$symbol',
                                                    '$$symbol'
                                                ]
                                            },
                                            {
                                                '$lt': [
                                                    '$price',
                                                    '$$sellPrice'
                                                ]
                                            }
                                        ]
                                    },
                                },
                            }
                        ],
                        'as': 'prices'
                    }
                },
                {
                    $limit: 50
                },
                {
                    $sort: { created_date: -1 }
                }
            ]
            let orders = await Order_eth.aggregate(getOrderQuery)
            resolve(orders)
        })
    },

    orderUpdate : (orderId, providerType, status) => {
        return new Promise(async(resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            await collection.updateOne({_id: orderId}, {$set : {cron_update_time: new Date(), status: status}})
            resolve(true)
        })
    },

    moveCompleteOrder : (providerType) => {
        return new Promise(async(resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let orderComplete = (providerType == "BNB") ? Sell_order_bsc : Sell_order_eth
            let response = await collection.find({providerType : providerType, status: "complete"})
            if(response.length > 0){
                for(let orderLoop = 0; orderLoop < response.length; orderLoop++){
                    let orderObject = {
                        userId          :   response[orderLoop]["userId"] ,
                        orderType       :   response[orderLoop]["orderType"] ,
                        from_contract_address : response[orderLoop]["from_contract_address"] ,
                        to_contract_address : response[orderLoop]["to_contract_address"] ,
                        from_symbol     :   response[orderLoop]["from_symbol"] ,
                        to_symbol       :   response[orderLoop]["to_symbol"] ,
                        quantity        :   response[orderLoop]["quantity"] ,
                        sellPrice       :   response[orderLoop]["sellPrice"] ,
                        sellDateBefore  :   response[orderLoop]["sellDateBefore"] ,
                        status          :   response[orderLoop]["status"] ,
                        providerType    :   response[orderLoop]["providerType"] ,
                        created_date    :   response[orderLoop]["created_date"] ,
                        updated_date    :   response[orderLoop]["updated_date"] ,
                        sold_price      :   response[orderLoop]["sold_price"] ,
                        sell_date       :   response[orderLoop]["sell_date"],
                        transaction_hash :  response[orderLoop]["transaction_hash"]
                    }
                    await orderComplete.create(orderObject)
                    await collection.deleteOne({_id : response[orderLoop]["_id"]})
                }
                resolve(response.length)
            }else{
                resolve(0)
            }
        })
    },

    moveCancelOrders : (providerType) => {
        return new Promise(async(resolve) => {
            let collection = (providerType == "BNB") ? Order_bsc : Order_eth
            let cancelOrder = (providerType == "BNB") ? Cancel_order_bsc : Cancel_order_eth
            let response = await collection.find({providerType : providerType, status: "cancel"})
            if(response.length > 0){
                for(let orderLoop = 0; orderLoop < response.length; orderLoop++){
                    let orderObject = {
                        userId          :   response[orderLoop]["userId"] ,
                        orderType       :   response[orderLoop]["orderType"] ,
                        from_contract_address : response[orderLoop]["from_contract_address"] ,
                        to_contract_address : response[orderLoop]["to_contract_address"] ,
                        from_symbol     :   response[orderLoop]["from_symbol"] ,
                        to_symbol       :   response[orderLoop]["to_symbol"] ,
                        quantity        :   response[orderLoop]["quantity"] ,
                        sellPrice       :   response[orderLoop]["sellPrice"] ,
                        sellDateBefore  :   response[orderLoop]["sellDateBefore"] ,
                        status          :   response[orderLoop]["status"] ,
                        providerType    :   response[orderLoop]["providerType"] ,
                        created_date    :   response[orderLoop]["created_date"] ,
                        updated_date    :   response[orderLoop]["updated_date"] ,
                    }
                    await cancelOrder.create(orderObject)
                    await collection.deleteOne({_id : response[orderLoop]["_id"]})
                }
                resolve(response.length)
            }else{
                resolve(0)
            } 
        })
    }
}

// await SportModel.aggregate([
//     {
//       $match: {
//         $and: query?.sportId?.length === 0 ? query?.sports : query?.sportId
//       }
//     },
//     {
//       $project: {
//         _id: 1,
//         name: 1,
//         icon: 1,
//         event: 1,
//         tournament: 1,
//         numberOfPlayer: 1,
//         inDoor: 1,
//         description: 1
//       }
//     },
//     {
//       $lookup: {
//         from: 'events',
//         let: { sportId: '$_id' },
//         pipeline: [
//           {
//             $geoNear: {
//               near: {
//                 type: 'Point',
//                 coordinates: query?.location
//               },
//               distanceField: 'distance.calculated',
//               maxDistance: +query?.radius * 1000,
//               includeLocs: 'distance.location',
//               spherical: true
//             }
//           },
//           {
//             $match: {
//               $expr: {
//                 $eq: ['$sportId', '$$sportId']
//               }
//             }
//           },
//           ...query?.eventTime,
//           {
//             $lookup: {
//               from: 'users',
//               let: { userId: '$userId' },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $eq: ['$_id', '$$userId']
//                     }
//                   }
//                 },
//                 {
//                   $project: {
//                     _id: 1,
//                     userName: 1,
//                     fullName: 1,
//                     avatar: 1
//                   }
//                 },
//                 {
//                   $lookup: {
//                     from: 'ratings',
//                     let: { userId: '$_id' },
//                     pipeline: [
//                       {
//                         $match: {
//                           $expr: {
//                             $eq: ['$userId', '$$userId']
//                           }
//                         }
//                       },
//                       {
//                         $project: {
//                           _id: 1,
//                           rating: 1
//                         }
//                       }
//                     ],
//                     as: 'userRating'
//                   }
//                 },
//                 {
//                   $unwind: {
//                     path: '$userRating',
//                     preserveNullAndEmptyArrays: true
//                   }
//                 },
//                 {
//                   $addFields: {
//                     average: {
//                       $avg: {
//                         $cond: [
//                           '$userRating.rating',
//                           '$userRating.rating',
//                           0
//                         ]
//                       }
//                     }
//                   }
//                 },
//                 {
//                   $sort: query?.ratingSort
//                 },
//                 {
//                   $group: {
//                     _id: '$_id',
//                     userName: { $first: '$userName' },
//                     fullName: { $first: '$fullName' },
//                     avatar: { $first: '$avatar' },
//                     average: {
//                       $avg: {
//                         $cond: [
//                           '$userRating.rating',
//                           '$userRating.rating',
//                           0
//                         ]
//                       }
//                     }
//                   }
//                 },
//                 {
//                   $sort: query?.ratingSort
//                 }
//               ],
//               as: 'userId'
//             }
//           },
//           {
//             $unwind: {
//               path: '$userId',
//               preserveNullAndEmptyArrays: true
//             }
//           },
//           {
//             $addFields: {
//               average: {
//                 $sum: {
//                   $cond: ['$userId.average', '$userId.average', 0]
//                 }
//               }
//             }
//           },
//           {
//             $group: {
//               _id: '$_id',
//               name: { $first: '$name' },
//               startDate: { $first: '$startDate' },
//               endDate: { $first: '$endDate' },
//               geoLocation: { $first: '$geoLocation' },
//               public: { $first: '$public' },
//               additionalMessage: { $first: '$additionalMessage' },
//               userId: { $push: '$userId' },
//               distance: { $first: '$distance' },
//               color: { $first: '$color' },
//               avatar: { $first: '$avatar' },
//               average: { $first: '$average' }
//             }
//           },
//         ],
//         as: 'events'
//       }
//     },
//     {
//       $lookup: {
//         from: 'tournaments',
//         let: { sportId: '$_id' },
//         pipeline: [
//           {
//             $geoNear: {
//               near: {
//                 type: 'Point',
//                 coordinates: query?.location
//               },
//               distanceField: 'distance.calculated',
//               maxDistance: +query?.radius * 1000,
//               includeLocs: 'distance.location',
//               spherical: true
//             }
//           },
//           {
//             $skip: +query?.page
//           },
//           {
//             $limit: +query?.limit
//           },
//           {
//             $match: {
//               $expr: {
//                 $eq: ['$sportId', '$$sportId']
//               }
//             }
//           },
//           ...query?.eventTime,

//           {
//             $project: {
//               _id: 1,
//               name: 1,
//               startDate: 1,
//               endDate: 1,
//               distance: { $divide: ['$distance.calculated', 1000] },
//               numberOfTeams: 1,
//               geoLocation: 1,
//               numberOfGames: 1,
//               description: 1,
//               userId: 1
//             }
//           },
//           {
//             $lookup: {
//               from: 'users',
//               let: { userId: '$userId' },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $eq: ['$_id', '$$userId']
//                     }
//                   }
//                 },
//                 {
//                   $project: {
//                     _id: 1,
//                     userName: 1,
//                     fullName: 1,
//                     avatar: 1
//                   }
//                 },
//                 {
//                   $lookup: {
//                     from: 'ratings',
//                     let: { userId: '$_id' },
//                     pipeline: [
//                       {
//                         $match: {
//                           $expr: {
//                             $eq: ['$userId', '$$userId']
//                           }
//                         }
//                       },
//                       {
//                         $project: {
//                           _id: 1,
//                           rating: 1
//                         }
//                       },
//                       {
//                         $addFields: {
//                           average: {
//                             $avg: {
//                               $cond: ['$rating', '$rating', 0]
//                             }
//                           }
//                         }
//                       },
//                       {
//                         $sort: query?.ratingSort
//                       }
//                     ],
//                     as: 'userRating'
//                   }
//                 },
//                 {
//                   $unwind: {
//                     path: '$userRating',
//                     preserveNullAndEmptyArrays: true
//                   }
//                 },
//                 {
//                   $addFields: {
//                     average: {
//                       $avg: {
//                         $cond: [
//                           '$userRating.rating',
//                           '$userRating.rating',
//                           0
//                         ]
//                       }
//                     }
//                   }
//                 },
//                 {
//                   $sort: query?.ratingSort
//                 },
//                 {
//                   $group: {
//                     _id: '$_id',
//                     userName: { $first: '$userName' },
//                     fullName: { $first: '$fullName' },
//                     avatar: { $first: '$avatar' },
//                     average: {
//                       $avg: {
//                         $cond: [
//                           '$userRating.rating',
//                           '$userRating.rating',
//                           0
//                         ]
//                       }
//                     }
//                   }
//                 }
//               ],
//               as: 'userId'
//             }
//           },
//           {
//             $skip: +query?.page
//           },
//           {
//             $limit: +query?.limit
//           }
//         ],
//         as: 'tournaments'
//       }
//     },
//     {
//       $unwind: {
//         path: '$events',
//         preserveNullAndEmptyArrays: true
//       }
//     },
//     {
//       $addFields: {
//         average: {
//           $sum: {
//             $cond: ['$events.average', '$events.average', 0]
//           }
//         }
//       }
//     },
//     {
//       $sort: query?.ratingSort
//     },
//     {
//       $sort: query?.closestSort
//     },
//     // {
//     //   $skip: +query?.page
//     // },
//     // {
//     //   $limit: +query?.limit
//     // },
//     {
//       $unwind: {
//         path: '$tournaments',
//         preserveNullAndEmptyArrays: true
//       }
//     },
//     {
//       $addFields: {
//         average: {
//           $sum: {
//             $cond: ['$tournaments.average', '$tournaments.average', 0]
//           }
//         }
//       }
//     },
//     {
//       $sort: query?.ratingSort
//     },
//     // {
//     //   $skip: +query?.page
//     // },
//     // {
//     //   $limit: +query?.limit
//     // },
//     {
//       $group: {
//         _id: '$_id',
//         name: { $first: '$name' },
//         icon: { $first: '$icon' },
//         event: { $first: '$event' },
//         tournament: { $first: '$tournament' },
//         events: { $push: '$events' },
//         tournaments: { $push: '$tournaments' },
//         average: {
//           $sum: {
//             $cond: ['$events.average', '$events.average', 0]
//           }
//         }
//       }
//     },
//     {
//       $sort: query?.ratingSort
//     }
//   ])

