import { Skeleton } from "antd";

export function FullPageLoader() {
    return (
        <div style={{ padding: 25 }} className="container">
            <Skeleton
                active
                paragraph={{ rows: 7, width: ["100%", "95%", "90%", "85%"] }}
            />
        </div>

    );
}
