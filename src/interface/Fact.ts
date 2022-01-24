import { Client } from "./Client";
import { User } from "./User";

type ClientType = {
  client: string | { value: ""; label: "" };
};

export interface Fact {
  _id?: string;
  cod_fact: number;
  user?: User | string;
  client: Client | string | any;
  payment_type: string;
  way_to_pay: string;
  subtotal: number;
  discount: number;
  customer_payment: number;
  status?: boolean;
  obs?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
