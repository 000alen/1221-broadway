// These are planning priors, not measurements of the five restaurants or tower.
export const priors={
 pickupSetup:{range:[.5,1.5,3],unit:'minutes / batch',basis:'Synthetic task allowance for locating and checking a batch; excludes loading and queue.'},
 pickupPerOrder:{range:[2/60,4/60,8/60],unit:'minutes / meal',basis:'Synthetic physical loading allowance: 2–8 seconds per labeled meal.'},
 ready:{range:[0,1,5],unit:'minutes',basis:'Synthetic local kitchen release deviation; common kitchen delay is added separately.'},
 dayKitchen:{range:[0,1,8],unit:'minutes',basis:'Synthetic shared lunch-rush delay, not independent restaurant observations.'},
 intake:{range:[.5,1.5,3],unit:'minutes / batch',basis:'Synthetic receiving and reconciliation allowance.'},
 floor:{range:[.04,.08,.15],unit:'minutes / meal',basis:'Synthetic shelf placement allowance; excludes elevator and floor walking.'},
 floorSetup:{range:[.3,.75,1.5],unit:'minutes / floor visit',basis:'Synthetic floor walking and setup allowance.'},
 elevatorOverhead:{range:[.25,.5,1],unit:'minutes / ride',basis:'Synthetic boarding, doors and acceleration allowance; resource queue is separate.'},
 elevatorSpeed:{range:[1.75,2.5,3.5],unit:'metres / second',basis:'Scenario range consistent with published Otis Gen3/Gen360 product speeds; equipment at 1221 Broadway is unverified.'},
 drop:{range:[.5,1.5,3],unit:'minutes / building',basis:'Synthetic unloading/access allowance.'},
 dropPerOrder:{range:[.03,.05,.1],unit:'minutes / meal',basis:'Synthetic non-tower placement allowance.'}
};
export const sources=[
 {name:'OSRM return-route baselines',url:'https://project-osrm.org/docs/v5.24.0/api/',use:'Return-to-pickup geometry and static routing times fetched for each route endpoint; 1.0–1.8 traffic multipliers are assumptions, not measured traffic.'},
 {name:'Otis Gen3/Gen360 product specifications',url:'https://www.otis.com/en/uk/products/gen3-gen360-platform',use:'Published equipment speeds inform the engineering range only; no identification of the installed tower elevators.'},
 {name:'Picnic Team Orders',url:'https://trypicnic.com/start/group-orders',use:'Describes a one-hour ordering cutoff for this offering; applicability to the case is unconfirmed.'},
 {name:'Deliveroo prep-time guide',url:'https://help.deliveroo.com/en/articles/2152581-how-do-prep-times-work',use:'Separates preparation, loading and travel; its example is illustrative, not a sample from these restaurants.'},
 {name:'DoorDash probabilistic ETAs',url:'https://careersatdoordash.com/blog/improving-etas-with-multi-task-models-deep-learning-and-probabilistic-forecasts/',use:'Supports modeling preparation, availability and parking uncertainty; supplies no local numerical calibration.'},
 {name:'Supplied Netlify route data',url:'https://picnic-ops-case.netlify.app/',use:'Road geometry and stated typical travel ranges. These ranges are reference inputs, not independently verified observations.'}
];
