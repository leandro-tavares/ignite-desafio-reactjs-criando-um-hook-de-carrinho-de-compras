import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const checkStock = async (
    productId: number,
    amount: number
  ): Promise<boolean> => {
    const response = await api.get<Stock>(`/stock/${productId}`);

    const stock = response.data.amount;

    if (amount > stock) {
      return false;
    }

    return true;
  };

  const addProduct = async (productId: number) => {
    try {
      const productOnCart = cart.find((product) => product.id === productId);

      if (productOnCart) {
        const newAmount = productOnCart.amount + 1;

        await updateProductAmount({
          productId,
          amount: newAmount,
        });
      } else {
        const product = await api
          .get<Product>(`/products/${productId}`)
          .catch(() => {
            throw new Error("Erro na adição do produto");
          });

        const newCart = [...cart, { ...product.data, amount: 1 }];

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        setCart(newCart);

        // toast.success("Produto adicionado no carrinho");
      }
    } catch (ex) {
      toast.error(ex.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const checkProduct = cart.find((product) => product.id === productId);

      if (!checkProduct) {
        throw new Error("Erro na remoção do produto");
      }

      const newCart = cart.filter((product) => product.id !== productId);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      setCart(newCart);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (!product || amount === 0) {
        throw new Error("Erro na alteração de quantidade do produto");
      }

      const checkStockResult = await checkStock(productId, amount);

      if (checkStockResult) {
        const newCart = [...cart];
        const productIndex = newCart.findIndex(
          (product) => product.id === productId
        );

        newCart[productIndex].amount = amount;
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

        setCart(newCart);
      } else {
        throw new Error("Quantidade solicitada fora de estoque");
      }
    } catch (ex) {
      toast.error(ex.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
