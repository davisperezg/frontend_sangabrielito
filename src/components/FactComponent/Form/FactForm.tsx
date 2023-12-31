import {
  ChangeEvent,
  memo,
  useEffect,
  useState,
  useMemo,
  useRef,
  KeyboardEvent,
  useContext,
  useCallback,
  FormEvent,
} from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Table,
} from "react-bootstrap";
import { postCreateFact } from "../../../api/fact/fact";
import { IAlert } from "../../../interface/IAlert";
import { Fact } from "../../../interface/Fact";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { Client } from "../../../interface/Client";
import { getClients } from "../../../api/client/client";
import { Product } from "../../../interface/Product";
import { BsFillCartFill } from "react-icons/bs";
import PaginationComponent from "../../DatatableComponent/Pagination/Pagination";
import TableHeader from "../../DatatableComponent/Header/TableHeader";
import styles from "./FactForm.module.scss";
import { getSequenceFact } from "../../../api/sequence/sequence";
import { AuthContext } from "../../../context/auth";
import {
  getDetailsFacts,
  postCreateDetailsFact,
} from "../../../api/detail-fact/detail";
import DetailItem from "../Detail/Item";
import {
  formatDate,
  formatter,
} from "../../../lib/helpers/functions/functions";
import ClientForm from "../../ClientComponent/Form/ClientForm";
import { useLocation } from "react-router-dom";
import { getModuleByMenu } from "../../../api/module/module";
import { useReactToPrint } from "react-to-print";
import { getFactById } from "../../../api/fact/fact";
import { getDetailsByIdFact } from "../../../api/detail-fact/detail";
import useFullPageLoader from "../../../hooks/FullPageLoader/useFullPageLoader";
import DetailView from "../Detail/ItemView";
import { format } from "path/posix";

const animatedComponents = makeAnimated();

type InputChange = ChangeEvent<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
>;

type KeyChange = KeyboardEvent<HTMLTableRowElement>;

let selected: any = [];

const FactForm = ({
  tab,
  show,
  fact,
  closeModal,
  listFacts,
  listProducts,
  products,
  listFactDeleted,
  byConsult,
}: {
  tab?: string;
  show: boolean;
  closeModal: () => void;
  fact?: Fact;
  listFacts?: () => void;
  listProducts?: () => void;
  products?: Product[];
  listFactDeleted?: () => void;
  byConsult?: boolean;
}) => {
  const initialStateFact = {
    cod_fact: "",
    client: "",
    payment_type: "CONTADO",
    way_to_pay: "EFECTIVO COMPLETO",
    subtotal: 0,
    discount: 0,
    customer_payment: 0,
  };

  const initialStateAlert: IAlert = {
    type: "",
    message: "",
  };

  const [form, setForm] = useState<Fact>(initialStateFact);
  const [message, setMessage] = useState<IAlert>(initialStateAlert);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [errors, setErrors] = useState<any>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [showProducts, setShowProducts] = useState<boolean>(false);
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState<string | any>("");
  const searchInput = useRef<HTMLInputElement | null>(null);
  const searchProducts = useRef<HTMLButtonElement | null>(null);
  const contentDiv = useRef<HTMLFormElement | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [sorting, setSorting] = useState({ field: "", order: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [numberFact, setNumberFact] = useState("");
  const [selectCliente, setSelectClient] = useState<any>({
    label: "",
    value: "",
  });
  const { user, resources } = useContext(AuthContext);
  const [showMoney, setShowMoney] = useState(false);
  const [showModalClient, setShowModalClient] = useState(false);
  const componentRef = useRef(null);
  const location = useLocation();
  const getNameLocation = location.pathname.slice(1);
  const [resource, setResource] = useState<any>(null);

  const [ticket, setTicket] = useState<any>({});
  const [details, setDetails] = useState<any[]>([]);
  const [loader, showLoader, hideLoader]: any = useFullPageLoader();

  const getMyModule = useCallback(async () => {
    const mymodule = await getModuleByMenu(getNameLocation);
    const findResource = resources.find(
      (res: any) => res.module.name === mymodule.data.name
    );
    setResource(findResource);
  }, [resources, getNameLocation]);

  const handleCloseModalMoney = () => {
    setShowMoney(false);
    setDisabled(false);
    setForm({ ...form, customer_payment: 0, subtotal: 0 });
  };
  const handleShowModalMoney = () => {
    setShowMoney(true);
    setForm({ ...form, subtotal: calSumSub() - form.discount });
  };

  const handleButtonFF = () => {
    if (form.customer_payment <= 0 || form.customer_payment === form.subtotal) {
      setMessage({
        type: "info",
        message: `Si el cliente esta pagando con 0 soles o la misma cantidad del total a pagar, por favor cierre la ventana y cambie a la forma de pago a: "EFECTIVO COMPLETO"`,
      });
    } else {
      const confirm = window.confirm(
        " ¿Estas seguro que quieres registrar la venta?"
      );
      if (confirm) {
        saveFactAndDetail();
        handleCloseModalMoney();
      }
    }
  };

  const ITEMS_PER_PAGE = 5;

  const headers = [
    { name: "Cod Barra/interno", field: "cod_internal", sortable: true },
    { name: "Producto", field: "name", sortable: true },
    { name: "Marca", field: "mark", sortable: true },
    { name: "Categoria", field: "model", sortable: true },
    { name: "Unidad", field: "unit", sortable: true },
    { name: "Stock", field: "stock", sortable: true },
    { name: "Precio Venta", field: "price", sortable: true },
    { name: "Precio Costo", field: "price_c", sortable: true },
    { name: "Añadir", field: "actiones", sortable: false },
  ];

  const handleSearch = () => {
    setSearch(searchInput.current?.value);
    setCurrentPage(1);
    showLoader();
    const findOneProduct: any = productsFiltered
      .map((format) => {
        return {
          ...format,
          cod_internal: String(format.cod_internal).slice(3),
        };
      })
      .find(
        (one) =>
          one.cod_internal.toUpperCase().trim() ===
          searchInput.current?.value.toUpperCase().trim()
      );

    if (findOneProduct) {
      const item = {
        fact: numberFact,
        cod_internal: findOneProduct.cod_internal,
        product: String(findOneProduct._id),
        quantity: 1,
        price: findOneProduct.price,
        discount: 0,
        name: findOneProduct.name,
        unit: findOneProduct.unit.name,
        stock: findOneProduct.stock,
      };

      if (findOneProduct.stock === 0) {
        alert(
          "Este producto no se puede agregar porque no tiene stock disponible."
        );
        hideLoader();
        return;
      }

      const isFound = list.find(
        (product: any) => product.product === item.product
      );

      if (!isFound) {
        // if (productsFiltered.length === 1) {
        setSearch("");
        setList([...list, item]);
        //}
      } else {
        setSearch("");
      }
    }
    hideLoader();
  };

  const getFac = async () => {
    const res = await getSequenceFact(user.area._id);
    const { data } = res;
    setNumberFact(data.sequence);
  };

  const listClients = async () => {
    const res = await getClients();
    const { data } = res;
    const filter = data.map((cli: any) => {
      return {
        label: cli.name + " " + cli.lastname,
        value: cli.nroDocument,
      };
    });
    const getClientNO = filter.find((find: any) => find.value === "00000000");
    setForm({ ...form, client: getClientNO.value });
    setSelectClient({ label: getClientNO.label, value: getClientNO.value });
    setClients(filter);
  };

  const productsFiltered = useMemo(() => {
    let computedProducts = products! || [];

    if (search) {
      computedProducts = computedProducts.filter((product) => {
        return (
          product.cod_internal.toLowerCase().includes(search.toLowerCase()) ||
          product.name.toLowerCase().includes(search.toLowerCase())
        );
      });
    }
    setTotalItems(computedProducts.length);

    //Sorting comments
    if (sorting.field) {
      const reversed = sorting.order === "asc" ? 1 : -1;
      computedProducts = computedProducts.sort((a: any, b: any) => {
        if (typeof a[sorting.field] === "object") {
          return (
            reversed *
            a[sorting.field].name
              .toString()
              .localeCompare(b[sorting.field].name.toString())
          );
        } else {
          return (
            reversed *
            a[sorting.field]
              .toString()
              .localeCompare(b[sorting.field].toString())
          );
        }
      });
    }

    //Current Page slice
    return computedProducts.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE
    );
  }, [products, search, currentPage, sorting]);

  const onPageChange = (page: number) => setCurrentPage(page);

  const onSorting = (field: string, order: string) =>
    setSorting({ field, order });

  const getDate = () => {
    const date = new Date();
    let value: string = "";

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    if (month < 10) {
      value = `${day}-0${month}-${year}`;
    } else {
      value = `${day}-${month}-${year}`;
    }
    return value;
  };

  const closeAndClear = () => {
    setForm({ ...initialStateFact, client: selectCliente.value });
    closeModal();
    setMessage(initialStateAlert);
    setErrors({});
    setSearch("");
    setList([]);
    setDisabled(false);
  };

  const findFormErrors = () => {
    //const { name } = form;
    const newErrors: any = {};
    // name errors
    //if (!name || name === "") newErrors.name = "Por favor ingrese el nombre.";

    return newErrors;
  };

  const handleChange = (e: InputChange) => {
    setMessage(initialStateAlert);
    if (!!errors[e.target.name])
      setErrors({
        ...errors,
        [e.target.name]: null,
      });

    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "discount" || e.target.name === "customer_payment"
          ? Number(e.target.value)
          : e.target.value,
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors = findFormErrors();
    setMessage(initialStateAlert);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      if (fact?._id && resource && resource.canUpdate) {
        showLoader();
        getTicket(fact?._id);
      } else {
        setDisabled(true);
        if (list.length <= 0) {
          setMessage({
            type: "danger",
            message: `No hay productos agregados.`,
          });
          setDisabled(false);
          return;
        }
        try {
          if (form.way_to_pay === "EFECTIVO CON VUELTO") {
            handleShowModalMoney();
            return;
          }
          const confirm = window.confirm(
            " ¿Estas seguro que quieres registrar la venta?"
          );
          if (confirm) {
            saveFactAndDetail();
          } else {
            setDisabled(false);
          }
        } catch (e) {
          setDisabled(false);
          const error: any = e as Error;
          const msg = error.response.data;
          setMessage({ type: "danger", message: msg.message });
        }
        setErrors({});
      }
    }
  };

  const handleAfterPrint = useCallback(() => {
    setTicket({});
    setDetails([]);
  }, []);

  const handleBeforePrint = useCallback(async () => {
    hideLoader();
  }, [hideLoader]);

  // const handleOnBeforeGetContent = useCallback(() => {
  //   console.log("`onBeforePrint` called");
  // }, [showLoader]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Comprobante de venta",
    onBeforePrint: handleBeforePrint,
    onAfterPrint: handleAfterPrint,
    //onBeforeGetContent: handleOnBeforeGetContent,
    removeAfterPrint: true,
  });

  const saveFactAndDetail = async () => {
    showLoader();
    if (resource && resource.canCreate) {
      try {
        const dataFact = await postCreateFact({
          ...form,
          cod_fact: numberFact,
          subtotal: calSumSub(),
        });

        for (let i = 0; i < list.length; i++) {
          const addProduct = {
            fact: numberFact,
            product: list[i].product,
            quantity: list[i].quantity,
            price: list[i].price,
            discount: list[i].discount,
          };
          const res = await postCreateDetailsFact(addProduct);

          if (res.data.details === true) {
            //tomandolo como si hubiera un error
            setMessage({
              type: "danger",
              message: `Venta anulada. Hay productos del cliente que sobrepasa el stock disponible. Los productos han sido devueltos al inventario.`,
            });
            getFac();
            listFactDeleted!();
            setDisabled(false);
            return;
          }
        }

        getFac();
        setMessage({
          type: "success",
          message: `La venta ha sido registrado existosamente.`,
        });
        setTimeout(() => {
          setMessage(initialStateAlert);
        }, 2000);
        //setForm({ ...initialStateFact, client: selectCliente.value });
        setList([]);
        const getClientNO: any = clients.find(
          (find: any) => find.value === "00000000"
        );
        setForm({ ...initialStateFact, client: getClientNO!.value });
        setSelectClient({
          label: getClientNO!.label,
          value: getClientNO!.value,
        });
        setDisabled(false);
        listProducts!();
        listFacts!();
        getTicket(dataFact.data.fact._id);
      } catch (e) {
        setDisabled(false);
        const error: any = e as Error;
        const msg = error.response.data;
        setMessage({ type: "danger", message: msg.message });
      }
    } else {
      setMessage({
        type: "danger",
        message: "No tienes acceso a este recurso.",
      });
      setDisabled(false);
      return;
    }
  };

  const onKeyDownDiv = (e: any) => {
    if (e.key === "Enter") {
      console.log("ee");
    }

    // if (!showProducts) {
    //   if (e.key === "Enter") {
    //     setShowProducts(true);
    //     setSearch("");
    //     setCurrentPage(1);
    //   }
    // }
  };

  const handleKeyDownInput = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "F2") {
      setSearch("");
      setCurrentPage(1);
    }

    if (e.key === "Escape") {
      setShowProducts(false);
      searchProducts.current!.focus();
      setSearch("");
      setCurrentPage(1);
      selected = [];
    }
  };

  const handleKeyDownButton = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "F2") {
      setSearch("");
      setCurrentPage(1);
      searchInput.current!.focus();
    }

    if (e.key === "Escape") {
      setShowProducts(false);
      searchProducts.current!.focus();
      selected = [];
    }
  };

  const handleKeyDownTr = (e: KeyChange, pro: any) => {
    if (e.key === "Enter") {
      const item = {
        fact: numberFact,
        cod_internal: pro.cod_internal,
        product: String(pro!._id),
        quantity: 1,
        price: pro.price,
        discount: 0,
        name: pro.name,
        unit: pro.unit.name,
        stock: pro.stock,
      };

      if (item.stock === 0) {
        alert(
          "Este producto no se puede agregar porque no tiene stock disponible."
        );
        return;
      }

      const isFound = list.find(
        (product: any) => product.product === item.product
      );

      if (!isFound) {
        setList([...list, item]);
      }
    }

    if (e.key === "F2") {
      setSearch("");
      setCurrentPage(1);
      searchInput.current!.focus();
    }
  };

  const handleClickList = (pro: any) => {
    const item = {
      fact: numberFact,
      cod_internal: pro.cod_internal,
      product: String(pro!._id),
      quantity: 1,
      price: pro.price,
      discount: 0,
      name: pro.name,
      unit: pro.unit.name,
      stock: pro.stock,
    };

    if (item.stock === 0) {
      alert(
        "Este producto no se puede agregar porque no tiene stock disponible."
      );
      return;
    }

    const isFound = list.find(
      (product: any) => product.product === item.product
    );

    if (!isFound) {
      setList([...list, item]);
    }
  };

  const deleteItem = (id: string) => {
    const filterItemDeleted = list.filter((item: any) => item.product !== id);
    setList(filterItemDeleted);
  };

  const getProductByItem = (item: any[]) => {
    setList(item);
  };

  const calSumSub = () => {
    return list.reduce(
      (previousValue: any, currentValue: any) =>
        previousValue +
        currentValue.price * currentValue.quantity -
        currentValue.discount,

      0
    );
  };

  const closeModalClient = () => setShowModalClient(false);

  const openModalClient = () => setShowModalClient(true);

  const getFactByIdEdit = useCallback(async () => {
    const noCode = String(fact?.cod_fact).slice(3).toUpperCase();
    setForm({
      cod_fact: fact?.cod_fact || "",
      client: String(fact?.client) || "",
      payment_type: fact?.payment_type || "",
      way_to_pay: fact?.way_to_pay || "",
      subtotal: fact?.subtotal || 0,
      discount: fact?.discount || 0,
      customer_payment: fact?.customer_payment || 0,
    });
    setNumberFact(noCode);
    const res = await getDetailsFacts(String(fact?._id));

    const filter = res.data.map((detail: any) => {
      return {
        fact: detail.fact.cod_fact,
        cod_internal: detail.product.cod_internal,
        product: detail.product._id,
        quantity: detail.quantity,
        price: detail.price,
        price_c: detail.product.price_c,
        discount: detail.discount,
        name: detail.product.name,
        unit: detail.product.unit.name,
      };
    });
    setList(filter);
  }, [
    fact?._id,
    fact?.cod_fact,
    fact?.client,
    fact?.payment_type,
    fact?.way_to_pay,
    fact?.subtotal,
    fact?.discount,
    fact?.customer_payment,
  ]);

  const getTicket = async (id: string) => {
    const resFact = await getFactById(id);
    setTicket(resFact.data);
    const resDetails = await getDetailsByIdFact(id);
    setDetails(resDetails.data);
    handlePrint();
  };

  const Ticket = () => (
    <div className={styles.content} ref={componentRef}>
      <div className={styles.ticket}>
        {/* <img
          className={styles.ticket__img}
          src="https://logodownload.org/wp-content/uploads/2016/03/ticket-logo.png"
          alt="Logotipo"
        /> */}
        <h1 className={styles.ticket__centrado}>COMERCIAL SARAI</h1>
        <p className={styles.ticket__centrado}>
          TICKET DE VENTA
          <br />
          {ticket.area} - 000{String(ticket.cod_fact).slice(3)}
          <br />
          {formatDate(new Date(ticket.fecha_creada))}
        </p>
        <div className={styles.ticket__centrado_noMargin}>
          <strong>CLIENTE: </strong>
          {ticket.cliente}
        </div>
        <div className={styles.ticket__centrado_noMargin}>
          <strong>VENDEDOR: </strong>
          {ticket.vendedor}
        </div>
        <p className={styles.ticket__centrado}>
          {ticket.tipo_pago} - {ticket.forma_pago}
        </p>
        <div className={styles.ticket__centrado_Table}>
          <table>
            <h1 className={styles.canceled}>
              {ticket.status === false && "Anulado"}
            </h1>
            <thead>
              <tr>
                <th className={styles.cantidad}>CANT</th>
                <th className={styles.producto}>PROD.</th>
                <th className={styles.pu}>P. U.</th>
                <th className={styles.descuento}>DESC.</th>
                <th className={styles.total}>S/</th>
              </tr>
            </thead>
            <tbody>
              {details.map((dtls, i) => {
                return (
                  <tr key={i}>
                    <td className={styles.cantidad}>{dtls.cantidad}</td>
                    <td className={styles.producto}>{dtls.producto}</td>
                    <td className={styles.pu}>
                      {formatter.format(dtls.precio)}
                    </td>
                    <td className={styles.descuento}>
                      {formatter.format(dtls.descuento)}
                    </td>
                    <td className={styles.total}>
                      {/* dtls.precio - dtls.descuento DESCUENTO APLICADO */}
                      {/* dtls.precio DESCUENTO NO APLICADO */}
                      {formatter.format(
                        dtls.precio * dtls.cantidad - dtls.descuento
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className={styles.ticket__borderTR}>
                <td></td>

                <td>
                  <strong>SUB TOTAL</strong>
                </td>
                <td></td>
                <td></td>
                <td>
                  <div className={styles.iconAndSoles}>
                    <div>S/</div>
                    <div className={styles.iconAndSoles__soles}>
                      {formatter.format(ticket.total)}
                    </div>
                  </div>
                </td>
              </tr>

              {ticket.forma_pago === "EFECTIVO CON VUELTO" ? (
                <>
                  <tr className={styles.ticket__tr}>
                    <td></td>
                    <td>
                      <strong>DESCUENTO</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td className={styles.ticket__soles}>
                      <div className={styles.iconAndSoles}>
                        <div>S/</div>
                        <div className={styles.iconAndSoles__soles}>
                          {!ticket.descuento || ticket.descuento === 0
                            ? formatter.format(0)
                            : formatter.format(ticket.descuento)}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr className={styles.ticket__tr}>
                    <td></td>
                    <td>
                      <strong>TOTAL</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td className={styles.ticket__soles}>
                      <div className={styles.iconAndSoles}>
                        <div>S/</div>
                        <div className={styles.iconAndSoles__soles}>
                          {!ticket.descuento || ticket.descuento === 0
                            ? formatter.format(ticket.total)
                            : formatter.format(ticket.total - ticket.descuento)}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr className={styles.ticket__tr}>
                    <td></td>
                    <td>
                      <strong>PAGO CON</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td className={styles.ticket__soles}>
                      <div className={styles.iconAndSoles}>
                        <div>S/</div>
                        <div className={styles.iconAndSoles__soles}>
                          {formatter.format(ticket.pago_cliente)}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr className={styles.ticket__tr}>
                    <td></td>
                    <td>
                      <strong>VUELTO</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td className={styles.ticket__soles}>
                      <div className={styles.iconAndSoles}>
                        <div>S/</div>
                        <div className={styles.iconAndSoles__soles}>
                          {ticket.total -
                            ticket.descuento -
                            ticket.pago_cliente <
                          0
                            ? String(
                                formatter.format(
                                  ticket.total -
                                    ticket.descuento -
                                    ticket.pago_cliente
                                )
                              ).slice(1)
                            : formatter.format(
                                ticket.total -
                                  ticket.descuento -
                                  ticket.pago_cliente
                              )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className={styles.ticket__tr}>
                    <td></td>
                    <td>
                      <strong>DESCUENTO</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td className={styles.ticket__soles}>
                      <div className={styles.iconAndSoles}>
                        <div>S/</div>
                        <div className={styles.iconAndSoles__soles}>
                          {!ticket.descuento || ticket.descuento === 0
                            ? formatter.format(0)
                            : formatter.format(ticket.descuento)}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr className={styles.ticket__tr}>
                    <td></td>
                    <td>
                      <strong>TOTAL</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td className={styles.ticket__soles}>
                      <div className={styles.iconAndSoles}>
                        <div>S/</div>
                        <div className={styles.iconAndSoles__soles}>
                          {!ticket.descuento || ticket.descuento === 0
                            ? formatter.format(ticket.total)
                            : formatter.format(ticket.total - ticket.descuento)}
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.ticket__centrado}>
          ¡GRACIAS POR SU COMPRA!
          <br />
          vuelva pronto :)
        </p>
      </div>
    </div>
  );

  useEffect(() => {
    if (fact?._id) {
      getFactByIdEdit();
      return;
    }

    if (tab === "create") {
      searchInput.current!.focus();
    }

    getMyModule();
    getFac();
    listClients();
  }, [tab, getFactByIdEdit, fact?._id, getMyModule]);

  const calSumPriceC = () => {
    return list.reduce(
      (previousValue: any, currentValue: any) =>
        previousValue + currentValue.price_c * currentValue.quantity,
      0
    );
  };

  return (
    <>
      <div style={{ display: "none" }}>
        <Ticket />
      </div>
      {fact?._id ? (
        <Modal show={show} onHide={closeAndClear} top="true" size="xl">
          <Modal.Header closeButton>
            <Modal.Title>{form?._id && "Ver Venta"}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                <div style={{ width: "70%" }}>
                  <Row className="mb-3">
                    <Form.Group md="3" as={Col} controlId="formGridFech">
                      <Form.Label>Fecha</Form.Label>
                      <Form.Control
                        name="fech"
                        value={
                          fact?._id &&
                          formatDate(new Date(String(fact?.createdAt)))
                        }
                        type="text"
                        disabled
                      />
                    </Form.Group>
                    <Form.Group md="8" as={Col} controlId="formGridType">
                      <Form.Label>Tipo de pago</Form.Label>
                      <Form.Select
                        name="payment_type"
                        value={form?.payment_type}
                        isInvalid={!!errors?.payment_type}
                        disabled={true}
                      >
                        <option value="CONTADO">CONTADO</option>
                        <option value="CREDITO">CREDITO</option>
                      </Form.Select>
                    </Form.Group>
                  </Row>
                  <Row className="mb-3">
                    <Form.Group md="7" as={Col} controlId="formGridFech">
                      <Form.Label>Cliente</Form.Label>
                      <Select
                        isDisabled={true}
                        value={{
                          label: String(fact?.client),
                          value: String(fact?.client),
                        }}
                      />
                    </Form.Group>
                    <Form.Group md="4" as={Col} controlId="formGridType">
                      <Form.Label>Forma de pago</Form.Label>
                      <Form.Select
                        name="way_to_pay"
                        value={form?.way_to_pay}
                        isInvalid={!!errors?.way_to_pay}
                        disabled={true}
                      >
                        {form?.payment_type === "CREDITO" && (
                          <option value="POR PAGAR">POR PAGAR</option>
                        )}
                        <option value="EFECTIVO COMPLETO">
                          EFECTIVO COMPLETO
                        </option>
                        <option value="EFECTIVO CON VUELTO">
                          EFECTIVO CON VUELTO
                        </option>
                        <option value="YAPE">YAPE</option>
                        <option value="PLIN">PLIN</option>
                      </Form.Select>
                    </Form.Group>
                  </Row>
                </div>
                <div style={{ width: "30%" }}>
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        textAlign: "center",
                        flexDirection: "column",
                        padding: 20,
                        border: "1px solid #000",
                      }}
                    >
                      <h3>RUC: 10443373824</h3>
                      <h3>
                        <strong>GUIA DE VENTA</strong>
                      </h3>
                      <h3>N° 000{numberFact}</h3>
                    </div>
                  </div>
                </div>
              </div>
              <Table striped bordered hover responsive className="mt-3">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Cod Barra/interno</th>
                    <th>Producto</th>
                    <th>U. Medida</th>
                    {!fact?._id && <th>Stock</th>}
                    <th>Cantidad</th>
                    <th>Precio Venta</th>
                    {user.role.name === "SUPER ADMINISTRADOR" && (
                      <th>Precio Costo</th>
                    )}
                    <th>Descuento X Prod.</th>
                    <th>Total</th>
                    {!fact?._id && <th className="text-center">Eliminar</th>}
                  </tr>
                </thead>
                <tbody>
                  {fact?._id &&
                    list.map((listed, i: number) => (
                      <DetailView
                        key={listed.product}
                        listed={listed}
                        item={i}
                      />
                    ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    {user.role.name === "SUPER ADMINISTRADOR" && <td></td>}
                    <td>
                      <strong>SubTotal</strong>
                    </td>
                    <td>{`S/${formatter.format(calSumSub())}`}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    {user.role.name === "SUPER ADMINISTRADOR" && <td></td>}
                    <td>
                      <strong>Descuento General</strong>
                    </td>
                    <td>{`S/${formatter.format(form.discount)}`}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    {user.role.name === "SUPER ADMINISTRADOR" && <td></td>}
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td>{`S/${formatter.format(
                      calSumSub() - form.discount
                    )}`}</td>
                  </tr>
                  {fact?._id && form.way_to_pay === "EFECTIVO CON VUELTO" && (
                    <>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>
                          <strong>Pagó con</strong>
                        </td>
                        <td>{`S/${formatter.format(
                          form.customer_payment
                        )}`}</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td>
                          <strong>Vuelto</strong>
                        </td>
                        <td>{`S/${
                          form.subtotal - form.customer_payment < 0
                            ? String(
                                formatter.format(
                                  form.subtotal - form.customer_payment
                                )
                              ).slice(1)
                            : formatter.format(
                                form.subtotal - form.customer_payment
                              )
                        }`}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </Table>
              {user.role.name === "SUPER ADMINISTRADOR" && (
                <strong>
                  RESUMEN DE VENTA: ITV({`S/${formatter.format(calSumSub())}`})
                  - ITC({`S/${formatter.format(calSumPriceC())}`}) ={" "}
                  <strong
                    style={
                      calSumSub() - calSumPriceC() <= 0
                        ? { color: "red" }
                        : { color: "green" }
                    }
                  >{`S/${formatter.format(
                    calSumSub() - calSumPriceC()
                  )}`}</strong>
                </strong>
              )}
            </div>
            {loader}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={closeAndClear}>
              Cerrar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={disabled}
              onClick={onSubmit}
            >
              Imprimir
            </Button>
          </Modal.Footer>
        </Modal>
      ) : (
        byConsult === false && (
          <Form onSubmit={onSubmit}>
            {message.type && (
              <Alert variant={message.type}>{message.message}</Alert>
            )}

            <Modal show={showMoney} onHide={handleCloseModalMoney} centered>
              <Modal.Header closeButton style={{ background: "yellow" }}>
                <Modal.Title>EFECTIVO CON VUELTO</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form.Group
                  as={Row}
                  className="mb-3"
                  controlId="formHorizontalTotal"
                  id="formHorizontalTotal"
                >
                  <Form.Label column sm={6}>
                    Total a pagar (S/)
                  </Form.Label>
                  <Col sm={6}>
                    <Form.Control
                      name="subtotal"
                      type="number"
                      defaultValue={`${formatter.format(form.subtotal)}`}
                      disabled
                    />
                  </Col>
                </Form.Group>
                <Form.Group
                  as={Row}
                  className="mb-3"
                  controlId="formHorizontalPaga"
                >
                  <Form.Label column sm={6}>
                    Paga con (S/)
                  </Form.Label>
                  <Col sm={6}>
                    <Form.Control
                      type="number"
                      name="customer_payment"
                      value={form.customer_payment}
                      onChange={(e) => {
                        if (Number(e.target.value) < 0) {
                          alert("El monto a pagar no puede ser negativo");
                        } else {
                          setForm({
                            ...form,
                            customer_payment: Number(e.target.value),
                          });
                        }
                      }}
                      step="0.01"
                      min="0"
                    />
                  </Col>
                </Form.Group>
                <Form.Group
                  as={Row}
                  className="mb-3"
                  controlId="formHorizontalVuelto"
                >
                  <Form.Label column sm={6}>
                    Vuelto (S/)
                  </Form.Label>
                  <Col sm={6}>
                    <Form.Control
                      type="number"
                      value={
                        form.customer_payment
                          ? Number(form.subtotal) -
                              Number(form.customer_payment) <
                            0
                            ? String(
                                formatter.format(
                                  Number(form.subtotal) -
                                    Number(form.customer_payment)
                                )
                              ).slice(1)
                            : `${formatter.format(
                                Number(form.subtotal) -
                                  Number(form.customer_payment)
                              )}`
                          : formatter.format(0)
                      }
                      disabled
                      min="0"
                    />
                  </Col>
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseModalMoney}>
                  Cerrar
                </Button>
                <Button variant="success" onClick={handleButtonFF}>
                  Finalizar venta
                </Button>
              </Modal.Footer>
            </Modal>

            <ClientForm
              show={showModalClient}
              closeModal={closeModalClient}
              listClients={listClients}
            />

            <div style={{ width: "100%", display: "flex" }}>
              <div style={{ width: "65%" }}>
                <Row className="mb-3" style={{ marginRight: 5 }}>
                  <Col xs={4} md={4} sm={12}>
                    <Form.Group md="12" as={Col} controlId="formGridFech">
                      <Form.Label>Fecha</Form.Label>
                      <Form.Control
                        name="fech"
                        value={
                          fact?._id
                            ? formatDate(new Date(String(fact?.createdAt)))
                            : getDate()
                        }
                        type="text"
                        disabled
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={8} md={6} sm={12}>
                    <Form.Group md="12" as={Col} controlId="formGridType">
                      <Form.Label>Tipo de pago</Form.Label>
                      <Form.Select
                        name="payment_type"
                        onChange={(e) => {
                          if (e.target.value === "CREDITO") {
                            setForm({
                              ...form,
                              payment_type: e.target.value,
                              way_to_pay: "POR PAGAR",
                            });
                          } else {
                            setForm({
                              ...form,
                              payment_type: e.target.value,
                              way_to_pay: "EFECTIVO COMPLETO",
                            });
                          }
                        }}
                        value={form?.payment_type}
                        isInvalid={!!errors?.payment_type}
                        disabled={fact?._id ? true : false}
                      >
                        <option value="CONTADO">CONTADO</option>
                        <option value="CREDITO">CREDITO</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={2} md={2} sm={12}>
                    <Form.Group md="12" as={Col} controlId="formGridNro">
                      GUIA DE VENTA <strong>N° 000{numberFact}</strong>
                    </Form.Group>
                  </Col>
                  {/* <div className={styles.contentRuc}>
                    <div className={styles.contentData}>
                      <h3>RUC: 10443373824</h3>
                      <h3>
                        <strong>GUIA DE VENTA</strong>
                      </h3>
                      <h3>N° 000{numberFact}</h3>
                    </div>
                  </div> */}
                </Row>

                <Row className="mb-3" style={{ marginRight: 5 }}>
                  <Col xs={6} md={6} sm={12}>
                    <Form.Group md="12" as={Col} controlId="formGridFech">
                      <Form.Label>
                        Cliente{" "}
                        {!fact?._id && (
                          <strong
                            style={{ cursor: "pointer" }}
                            className="text-primary"
                            onClick={openModalClient}
                          >
                            Registrar cliente
                          </strong>
                        )}
                      </Form.Label>
                      <Select
                        isDisabled={fact?._id ? true : false}
                        closeMenuOnSelect={true}
                        components={animatedComponents}
                        value={
                          form.client === ""
                            ? []
                            : {
                                label: selectCliente.label,
                                value: selectCliente.value,
                              }
                        }
                        onChange={(values: any) => {
                          setMessage(initialStateAlert);
                          const { label, value } = values;
                          setSelectClient({ label, value });
                          setForm({ ...form, client: value });
                        }}
                        options={clients}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={6} md={6} sm={12}>
                    <Form.Group md="12" as={Col} controlId="formGridType">
                      <Form.Label>Forma de pago</Form.Label>
                      <Form.Select
                        name="way_to_pay"
                        onChange={handleChange}
                        value={form?.way_to_pay}
                        isInvalid={!!errors?.way_to_pay}
                        disabled={
                          fact?._id || form?.payment_type === "CREDITO"
                            ? true
                            : false
                        }
                      >
                        {form?.payment_type === "CREDITO" && (
                          <option value="POR PAGAR">POR PAGAR</option>
                        )}
                        <option value="EFECTIVO COMPLETO">
                          EFECTIVO COMPLETO
                        </option>
                        <option value="EFECTIVO CON VUELTO">
                          EFECTIVO CON VUELTO
                        </option>
                        <option value="YAPE">YAPE</option>
                        <option value="PLIN">PLIN</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={12}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        marginRight: 20,
                        marginTop: 20,
                      }}
                    >
                      <Form.Control
                        type="text"
                        autoFocus
                        style={{ width: "400px" }}
                        className="p-1 mb-3"
                        placeholder="Introduce Cod. de barra / interno o nombre del producto"
                        value={search.toUpperCase()}
                        ref={searchInput}
                        onChange={handleSearch}
                        onKeyDown={handleKeyDownInput}
                      />
                    </div>

                    <div
                      className={styles.contentTable}
                      style={{ marginRight: 20 }}
                    >
                      <Table striped bordered hover responsive className="mt-3">
                        <TableHeader
                          headers={
                            user.role.name === "SUPER ADMINISTRADOR"
                              ? headers
                              : headers.filter(
                                  (head) => head.field !== "price_c"
                                )
                          }
                          onSorting={onSorting}
                        />
                        <tbody>
                          {productsFiltered.map((pro: any) => {
                            return (
                              <tr
                                tabIndex={0}
                                key={pro._id}
                                onKeyDown={(e) => handleKeyDownTr(e, pro)}
                                className={styles.tr}
                              >
                                <td>{String(pro.cod_internal).slice(3)}</td>
                                <td>{pro.name}</td>
                                <td>{pro.mark.name}</td>
                                <td>{pro.model.name}</td>
                                <td>{pro.unit.name}</td>
                                <td className="text-center">
                                  {pro.stock === 0 ? (
                                    <strong style={{ color: "red" }}>
                                      {pro.stock}
                                    </strong>
                                  ) : (
                                    <strong style={{ color: "green" }}>
                                      {pro.stock}
                                    </strong>
                                  )}
                                </td>
                                <td>S/{formatter.format(pro.price)}</td>
                                {user.role.name === "SUPER ADMINISTRADOR" && (
                                  <td>
                                    S/
                                    {pro.price_c === undefined
                                      ? "No Registrado"
                                      : formatter.format(pro.price_c)}
                                  </td>
                                )}
                                <td className="text-center">
                                  <BsFillCartFill
                                    type="button"
                                    onClick={() => handleClickList(pro)}
                                    className="text-success font-weight-bold"
                                    style={{ cursor: "pointer" }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                </Row>
              </div>
              <div
                style={{
                  width: "35%",
                  border: "1px solid #444",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  height: "600px",
                }}
              >
                <div
                  style={{
                    height: "calc(100% - 150px)",
                    overflowX: "auto",
                    overflowY: "auto",
                  }}
                >
                  {list.map((listed, i: number) => (
                    <DetailItem
                      key={listed.product}
                      listed={listed}
                      item={i}
                      list={list}
                      deleteItem={deleteItem}
                      numberFact={numberFact}
                      getProductByItem={getProductByItem}
                    />
                  ))}
                </div>

                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    bottom: 0,
                    height: 150,
                    display: "flex",
                    flexDirection: "column",
                    background: "#F5F8FB",
                    boxShadow:
                      "0 16px 32px rgb(55 71 79 / 8%), 0 8px 24px rgb(55 71 79 / 10%)",
                    borderTop: "10px solid #F1C023",
                  }}
                >
                  <div
                    style={{
                      height: "60%",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: 200,
                        display: "flex",
                        flexDirection: "column",
                        paddingRight: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          flexDirection: "row",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            width: "50%",
                          }}
                        >
                          <strong>SubTotal:</strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            width: "50%",
                            flexDirection: "row",
                            justifyContent: "flex-end",
                          }}
                        >
                          <strong>S/{formatter.format(calSumSub())}</strong>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          flexDirection: "row",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            width: "50%",
                          }}
                        >
                          <strong>Descuento:</strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            width: "50%",
                            flexDirection: "row",
                            justifyContent: "flex-end",
                          }}
                        >
                          <Form.Control
                            style={{ width: 100 }}
                            name="discount"
                            value={form.discount}
                            type="number"
                            disabled={fact?._id ? true : false}
                            onChange={(e) => {
                              if (Number(e.target.value) > calSumSub()) {
                                return;
                              } else if (Number(e.target.value) < 0) {
                                alert("El descuento no puede ser negativo");
                              } else {
                                setForm({
                                  ...form,
                                  discount: Number(e.target.value),
                                });
                              }
                            }}
                            step="0.01"
                            min="0"
                            max={calSumSub()}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          flexDirection: "row",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            width: "50%",
                          }}
                        >
                          <strong>Total:</strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            width: "50%",
                            flexDirection: "row",
                            justifyContent: "flex-end",
                          }}
                        >
                          S/{formatter.format(calSumSub() - form.discount)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: "40%", padding: "5px" }}>
                    <Button
                      className="btn btn-success w-100 h-100"
                      disabled={disabled}
                      type="submit"
                    >
                      Generar Venta
                    </Button>
                    {loader}
                  </div>
                </div>
              </div>
            </div>
          </Form>
        )
      )}
    </>
  );
};

export default memo(FactForm);
