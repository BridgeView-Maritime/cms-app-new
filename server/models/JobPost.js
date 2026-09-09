import mongoose from 'mongoose';

// Legacy bmpl.php job board. Note two quirks in the source data:
//  - `jobtitle` is empty on every one of the 6,407 rows; the position is
//    actually held in `rankid`, which stores the rank NAME as text
//    ("Oiler", "Chief Cook /Cook"), not an id.
//  - `status` is '1' for live postings, '0' for closed.
const JobPostSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    jobid: { type: Number, index: true },
    cms_jobid: { type: String, default: '' },
    rankid: { type: String, default: '' },
    companyname: { type: String, default: '' },
    jobarea: { type: String, default: '' },
    nationality: { type: String, default: '' },
    shiptype: { type: String, default: '', index: true },
    vesseltype: { type: String, default: '' },
    contract: { type: String, default: '' },
    salary: { type: String, default: '' },
    description: { type: String, default: '' },
    requirements: { type: String, default: '' },
    keyresponsibilities: { type: String, default: '' },
    agelimit: { type: String, default: '' },
    companyweb: { type: String, default: '' },
    website: { type: String, default: '' },
    url: { type: String, default: '' },
    postdate: { type: String, default: '' },
    status: { type: String, default: '1', index: true },
  },
  { strict: false, collection: 'collection_jobpost' }
);

export const JobPost = mongoose.models.JobPost || mongoose.model('JobPost', JobPostSchema);
