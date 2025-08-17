interface CRMCompanyResponse {
  data: {
    companies: Array<{
      id: string;
      name: string;
      domainName: {
        primaryLinkLabel: string;
        primaryLinkUrl: string;
        secondaryLinks: Array<{
          url: string;
          label: string | null;
        }> | null;
      };
      employees: number | null;
      linkedinLink: {
        primaryLinkLabel: string;
        primaryLinkUrl: string;
        secondaryLinks: any;
      };
      annualRecurringRevenue: {
        amountMicros: number | null;
        currencyCode: string;
      };
      address: {
        addressStreet1: string;
        addressStreet2: string | null;
        addressCity: string;
        addressPostcode: string;
        addressState: string | null;
        addressCountry: string;
        addressLat: number | null;
        addressLng: number | null;
      };
      idealCustomerProfile: boolean;
      position: number;
      createdBy: {
        source: string;
        workspaceMemberId: string | null;
        name: string;
        context: any;
      };
      searchVector: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      accountOwnerId: string | null;
      xLink: {
        primaryLinkLabel: string;
        primaryLinkUrl: string;
        secondaryLinks: any;
      };
      sourceUrl: string;
    }>;
  };
  pageInfo: {
    hasNextPage: boolean;
    startCursor: string;
    endCursor: string;
  };
  totalCount: number;
}

interface CRMCompany {
  id: string;
  name: string;
  domainUrl: string;
  sourceUrl: string;
  employees: number | null;
  address: {
    street1: string;
    street2: string | null;
    city: string;
    postcode: string;
    state: string | null;
    country: string;
  };
  linkedinUrl: string;
  revenue: {
    amount: number | null;
    currency: string;
  };
}

class CRMApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TWENTY_API_URL || 'https://20.afternoonltd.com';
  }

  async getCompanyById(companyId: string): Promise<CRMCompany | null> {
    try {
      const url = `${this.baseUrl}/rest/companies/${companyId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`CRM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CRMCompanyResponse;
      
      if (!data.data?.companies?.length) {
        return null;
      }

      const company = data.data.companies[0];
      
      return {
        id: company.id,
        name: company.name,
        domainUrl: company.domainName.primaryLinkUrl,
        sourceUrl: company.sourceUrl,
        employees: company.employees,
        address: {
          street1: company.address.addressStreet1,
          street2: company.address.addressStreet2,
          city: company.address.addressCity,
          postcode: company.address.addressPostcode,
          state: company.address.addressState,
          country: company.address.addressCountry,
        },
        linkedinUrl: company.linkedinLink.primaryLinkUrl,
        revenue: {
          amount: company.annualRecurringRevenue.amountMicros,
          currency: company.annualRecurringRevenue.currencyCode,
        },
      };
    } catch (error) {
      console.error(`Failed to fetch company ${companyId} from CRM:`, error);
      throw error;
    }
  }
}

export default new CRMApiService();