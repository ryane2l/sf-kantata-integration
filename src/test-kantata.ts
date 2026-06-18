import 'dotenv/config';
import { createKantataProject } from './jobs/createKantataProject';
import logger from './logger';

const mockJob: any = {
  data: {
    opportunityId: '006Vy00001FIS9ZIAX-TEST2',
    opportunityName: 'Elgin ISD | TX | LASO Cycle 4 LIFT | 26-27',
    accountName: 'Elgin Ind School District',
    billingAddress: '1002 North Avenue C, Elgin, Texas 78621, United States',
    amount: 285599.995,
    state: 'Texas',
    closeDate: '2026-04-25',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    stageName: 'Closed Won',
    projectOwnerEmail: 'diana@engage2learn.org',
    projectOwnerName: 'Diana Branch',
    opOwnerEmail: 'diana@engage2learn.org',
    opOwnerName: 'Diana Branch',
    lineItems: [
      { id: '01tHs00000BXAehIAH', productName: 'Strong Foundations Implementation', productCode: 'SD-SFS-01', productFamily: 'Service', quantity: 1, unitPrice: -0.13, totalPrice: -0.13, description: 'Strong Foundations Implementation' },
      { id: '01tHs00000BXAeYIAX', productName: 'e2L Coaching', productCode: 'CA-CAC-01', productFamily: 'Service', quantity: 41, unitPrice: 3111.49, totalPrice: 127571.09, description: 'e2L Coaching - bundled' },
      { id: '01tHs00000BXAenIAH', productName: 'e2L Travel Reimbursements', productCode: 'OT-TRV-01', productFamily: 'Travel & Admin', quantity: 41, unitPrice: 632.34, totalPrice: 25925.94, description: 'e2L Travel Reimbursements' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 25514.25, totalPrice: 25514.25, description: 'e2L Project Management (Gross) - bundled' },
      { id: '01tHs00000BXAeIIAX', productName: 'GroweLab Talent Development Platform', productCode: 'SW-GLU-02', productFamily: 'Software', quantity: 1, unitPrice: 9409.76, totalPrice: 9409.76, description: 'GroweLab Talent Development Platform - Used for Strategic Design Implementation Tracking' },
      { id: '01tHs00000BXDwaIAH', productName: 'GroweLab Annual Support/Maintenance Fee (tier 2)', productCode: 'CD-CAS-03', productFamily: 'Software', quantity: 1, unitPrice: 2509.27, totalPrice: 2509.27, description: 'GroweLab Annual Support/Maintenance Fee' },
      { id: '01tHs00000BXAebIAH', productName: 'Design Day', productCode: 'SD-DDY-01', productFamily: 'Service', quantity: 6, unitPrice: 3814.09, totalPrice: 22884.54, description: 'Design Day' },
      { id: '01tHs00000BXAenIAH', productName: 'e2L Travel Reimbursements', productCode: 'OT-TRV-01', productFamily: 'Travel & Admin', quantity: 6, unitPrice: 632.34, totalPrice: 3794.04, description: 'e2L Travel Reimbursements' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 4576.91, totalPrice: 4576.91, description: 'e2L Project Management (Gross) - bundled' },
      { id: '01tHs00000BXFgvIAH', productName: 'e2L Leader Training', productCode: 'EC-EET-01', productFamily: 'Service', quantity: 8, unitPrice: 3312.24, totalPrice: 26497.92, description: 'e2L Leader Training' },
      { id: '01tHs00000BXAenIAH', productName: 'e2L Travel Reimbursements', productCode: 'OT-TRV-01', productFamily: 'Travel & Admin', quantity: 8, unitPrice: 632.34, totalPrice: 5058.72, description: 'e2L Travel Reimbursements' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 5299.58, totalPrice: 5299.58, description: 'e2L Project Management (Gross) - bundled' },
      { id: '01tHs00000BXC1YIAX', productName: 'Off-Site Design Prep Work', productCode: 'OT-ODP-01', productFamily: 'Service', quantity: 5.5, unitPrice: 2509.27, totalPrice: 13800.985, description: 'Off-Site Design Prep Work - bundled' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 2760.2, totalPrice: 2760.2, description: 'e2L Project Management (Gross) - bundled' },
      { id: '01tHs00000BXAeLIAX', productName: 'Online Survey Creation', productCode: 'SD-OSC-01', productFamily: 'Product', quantity: 1, unitPrice: 3814.09, totalPrice: 3814.09, description: 'Online Survey Creation - bundled' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 762.82, totalPrice: 762.82, description: 'e2L Project Management (Gross) - bundled' },
      { id: '01tHs00000BXAeRIAX', productName: 'Data Disaggregation 1 Summit', productCode: 'SD-DDS-01', productFamily: 'Product', quantity: 1, unitPrice: 3011.12, totalPrice: 3011.12, description: '7cs' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 602.22, totalPrice: 602.22, description: 'e2L Project Management (Gross) - bundled' },
      { id: '01tHs00000BXAeNIAX', productName: 'Graphic Design', productCode: 'SD-GDN-01', productFamily: 'Product', quantity: 1, unitPrice: 1505.56, totalPrice: 1505.56, description: 'Graphic Design - bundled' },
      { id: '01tHs00000BXAeoIAH', productName: 'e2L Project Management (Gross)', productCode: 'PM-PMG-01', productFamily: 'Travel & Admin', quantity: 1, unitPrice: 301.11, totalPrice: 301.11, description: 'e2L Project Management (Gross) - bundled' },
    ],
  },
  updateData(newData: any) {
    this.data = newData;
    return Promise.resolve();
  },
};

async function run() {
  logger.info('Running Kantata project creation test...');
  await createKantataProject(mockJob);
  logger.info({ kantataProjectId: mockJob.data.kantataProjectId }, 'Test complete');
}

run().catch((err) => {
  logger.error({ err: err.message, response: err.response?.data }, 'Test failed');
  process.exit(1);
});
